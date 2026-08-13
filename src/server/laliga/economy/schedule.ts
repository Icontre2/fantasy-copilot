import { supabaseAdmin } from '@/src/server/storage/supabase-admin';
import { getValidAccessToken } from '../session.ts';
import { syncLeagueEconomy } from './sync.ts';
import { MAX_CONSECUTIVE_FAILURES, type SyncStatus, type SyncSubscription } from './schedule-status.ts';

/**
 * Sincronizacion automatica: que ligas se sincronizan solas y como fue la
 * ultima vez.
 *
 * ── Por que existe ───────────────────────────────────────────────────────────
 * El ledger detecta operaciones comparando dos fotos consecutivas, y solo puede
 * atribuir el importe a un jugador concreto cuando el manager hizo UNA operacion
 * entre esas dos fotos (`economy/transactions.ts`). Sincronizar a mano deja
 * huecos de horas o dias, y en un hueco caben varias operaciones: el dinero
 * total sigue cuadrando pero el desglose se pierde. Sincronizar a menudo no
 * mejora "un poco" el resultado: es lo que decide si el desglose existe.
 *
 * El diagnostico mostrable y la autorizacion del cron viven en
 * `schedule-status.ts`, que es puro y esta testeado. Aqui solo hay IO.
 */

export {
  describeSchedule,
  EXPECTED_SYNC_INTERVAL_MINUTES,
  isAuthorizedCronRequest,
  type ScheduleHealth,
  type ScheduleStatus,
  type SyncStatus,
  type SyncSubscription,
} from './schedule-status.ts';

/**
 * Cuantas ligas sincroniza como maximo una ejecucion.
 *
 * Cada liga son varias peticiones a LALIGA (una por manager). El limite evita
 * que una ejecucion se alargue sin control; las ligas que no entren van primero
 * en la siguiente, porque la cola se ordena por `last_run_at` ascendente.
 */
const MAX_LEAGUES_PER_RUN = 10;

type SubscriptionRow = {
  league_id: string;
  session_id: string;
  league_name: string | null;
  enabled: boolean;
  last_run_at: string | null;
  last_status: SyncStatus | null;
  last_error: string | null;
  last_detected_transactions: number | null;
  consecutive_failures: number;
};

const COLUMNS =
  'league_id, session_id, league_name, enabled, last_run_at, last_status, last_error, last_detected_transactions, consecutive_failures';

function toSubscription(row: SubscriptionRow): SyncSubscription {
  return {
    leagueId: row.league_id,
    leagueName: row.league_name,
    enabled: row.enabled,
    lastRunAt: row.last_run_at,
    lastStatus: row.last_status,
    lastError: row.last_error,
    lastDetectedTransactions: row.last_detected_transactions,
    consecutiveFailures: row.consecutive_failures,
  };
}

// --- Persistencia -----------------------------------------------------------

export async function readSubscription(leagueId: string): Promise<SyncSubscription | null> {
  const { data, error } = await supabaseAdmin()
    .from('fantasy_sync_subscriptions')
    .select(COLUMNS)
    .eq('league_id', leagueId)
    .maybeSingle<SubscriptionRow>();

  if (error) throw new Error(`No se pudo leer la suscripcion: ${error.message}`);
  return data ? toSubscription(data) : null;
}

/**
 * Activa la sincronizacion automatica de una liga con la sesion indicada.
 *
 * Reactivar limpia el estado de fallo: si el usuario ha vuelto a iniciar sesion,
 * arrastrar el `SESSION_EXPIRED` anterior mostraria una alarma ya resuelta.
 */
export async function enableAutoSync(input: {
  leagueId: string;
  sessionId: string;
  leagueName?: string;
}): Promise<SyncSubscription> {
  const { data, error } = await supabaseAdmin()
    .from('fantasy_sync_subscriptions')
    .upsert(
      {
        league_id: input.leagueId,
        session_id: input.sessionId,
        league_name: input.leagueName ?? null,
        enabled: true,
        last_status: null,
        last_error: null,
        consecutive_failures: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'league_id' },
    )
    .select(COLUMNS)
    .single<SubscriptionRow>();

  if (error) throw new Error(`No se pudo activar la sincronizacion: ${error.message}`);
  return toSubscription(data);
}

export async function disableAutoSync(leagueId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('fantasy_sync_subscriptions')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('league_id', leagueId);

  if (error) throw new Error(`No se pudo desactivar la sincronizacion: ${error.message}`);
}

async function recordOutcome(
  leagueId: string,
  outcome: { status: SyncStatus; error?: string; detected?: number; enabled?: boolean; failures: number },
): Promise<void> {
  await supabaseAdmin()
    .from('fantasy_sync_subscriptions')
    .update({
      last_run_at: new Date().toISOString(),
      last_status: outcome.status,
      last_error: outcome.error ?? null,
      last_detected_transactions: outcome.detected ?? null,
      consecutive_failures: outcome.failures,
      ...(outcome.enabled === undefined ? {} : { enabled: outcome.enabled }),
      updated_at: new Date().toISOString(),
    })
    .eq('league_id', leagueId);
}

// --- Ejecucion --------------------------------------------------------------

export type ScheduledRunResult = {
  startedAt: string;
  processed: number;
  results: { leagueId: string; status: SyncStatus; detected?: number; error?: string }[];
};

/**
 * Sincroniza las ligas suscritas. La ejecuta la tarea programada, no el usuario.
 *
 * Va **secuencial** a proposito: cada liga son varias peticiones a LALIGA y no
 * hay medicion de cuantas tolera por minuto (ver `docs/AUDITORIA_FASE_1.md`,
 * riesgo 7). Ante la duda, lento.
 *
 * Un fallo en una liga no detiene las demas: se registra en su fila y se sigue.
 */
export async function runScheduledSyncs(): Promise<ScheduledRunResult> {
  const startedAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin()
    .from('fantasy_sync_subscriptions')
    .select(COLUMNS)
    .eq('enabled', true)
    .lt('consecutive_failures', MAX_CONSECUTIVE_FAILURES)
    // La que lleva mas tiempo sin sincronizar, primero. `nullsFirst` deja
    // delante a las que nunca han corrido.
    .order('last_run_at', { ascending: true, nullsFirst: true })
    .limit(MAX_LEAGUES_PER_RUN)
    .returns<SubscriptionRow[]>();

  if (error) throw new Error(`No se pudieron leer las suscripciones: ${error.message}`);

  const results: ScheduledRunResult['results'] = [];

  for (const row of data ?? []) {
    const token = await getValidAccessToken(row.session_id);

    if (!token) {
      // La sesion murio. Se para y se marca: reintentar cada 3 horas contra una
      // sesion muerta solo generaria ruido, y dejarlo activo en silencio haria
      // creer que el historico sigue completandose.
      await recordOutcome(row.league_id, {
        status: 'SESSION_EXPIRED',
        error: 'La sesion de LALIGA caduco. Vuelve a iniciar sesion y reactiva la sincronizacion.',
        enabled: false,
        failures: row.consecutive_failures + 1,
      });
      results.push({ leagueId: row.league_id, status: 'SESSION_EXPIRED' });
      continue;
    }

    try {
      const sync = await syncLeagueEconomy(token, row.league_id);
      await recordOutcome(row.league_id, {
        status: 'OK',
        detected: sync.detectedTransactions,
        failures: 0,
      });
      results.push({ leagueId: row.league_id, status: 'OK', detected: sync.detectedTransactions });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      await recordOutcome(row.league_id, {
        status: 'ERROR',
        error: message,
        failures: row.consecutive_failures + 1,
      });
      results.push({ leagueId: row.league_id, status: 'ERROR', error: message });
    }
  }

  return { startedAt, processed: results.length, results };
}
