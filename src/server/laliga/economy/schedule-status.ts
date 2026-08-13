import { timingSafeEqual } from 'node:crypto';

/**
 * Parte pura de la sincronizacion automatica: el diagnostico que se muestra y
 * la autorizacion de la tarea programada.
 *
 * Vive separada de `schedule.ts` (que habla con Supabase y con LALIGA) para que
 * se pueda testear sin red ni base de datos, igual que el resto de la
 * aritmetica del proyecto.
 *
 * ── La regla que ordena este fichero ─────────────────────────────────────────
 * **Una sincronizacion que no corre debe ser visible.** Si la sesion caduca o la
 * API falla, el ledger no se equivoca — se queda quieto — pero seguiria
 * presentandose como si estuviera al dia, y eso si enganaria. De ahi que haya
 * estados distintos para "no esta activada", "va con retraso" y "esta parada":
 * son tres situaciones que el usuario debe poder distinguir de un vistazo.
 */

/**
 * Cada cuanto se espera que corra la tarea.
 *
 * DEBE coincidir con el `schedule` de `vercel.json`. Vive aqui porque es lo que
 * decide cuando una liga se considera "retrasada": si se cambia el cron sin
 * cambiar esto, la UI daria por bueno un retraso real.
 */
export const EXPECTED_SYNC_INTERVAL_MINUTES = 180;

/** Fallos seguidos tras los que se deja de reintentar sin intervencion. */
export const MAX_CONSECUTIVE_FAILURES = 5;

export type SyncStatus =
  /** Sincronizo correctamente. */
  | 'OK'
  /** La sesion de LALIGA caduco: hace falta volver a iniciar sesion. */
  | 'SESSION_EXPIRED'
  /** Fallo la lectura o la escritura. Se reintenta en la siguiente ejecucion. */
  | 'ERROR';

export type SyncSubscription = {
  leagueId: string;
  leagueName: string | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: SyncStatus | null;
  lastError: string | null;
  lastDetectedTransactions: number | null;
  consecutiveFailures: number;
};

export type ScheduleHealth =
  /** No esta activada. */
  | 'OFF'
  /** Activada pero todavia sin ejecutar ninguna vez. */
  | 'PENDING'
  /** Corriendo dentro de lo esperado. */
  | 'OK'
  /** Activada y sin correr desde hace mas de lo esperado. */
  | 'LATE'
  /** Parada: hace falta que el usuario haga algo (normalmente re-loguearse). */
  | 'STOPPED';

export type ScheduleStatus = {
  subscription: SyncSubscription | null;
  health: ScheduleHealth;
  /** Minutos desde la ultima ejecucion. `null` si nunca corrio. */
  minutesSinceLastRun: number | null;
  /** Frase lista para mostrar. La UI no reconstruye el diagnostico. */
  message: string;
};

/**
 * Traduce una suscripcion a un estado mostrable. Puro: el `now` entra como
 * parametro en vez de leer el reloj, para poder testear cada caso.
 *
 * El margen de gracia es 2x el intervalo: un unico ciclo perdido puede ser un
 * despliegue o un reinicio del planificador, y avisar por eso seria ruido. Dos
 * ciclos seguidos ya no es ruido.
 */
export function describeSchedule(
  subscription: SyncSubscription | null,
  now: Date = new Date(),
): ScheduleStatus {
  if (!subscription || !subscription.enabled) {
    return {
      subscription,
      health: 'OFF',
      minutesSinceLastRun: null,
      message:
        'La sincronizacion automatica esta desactivada. El desglose solo avanza cuando pulsas «Sincronizar ahora», y las operaciones que ocurran entre dos pulsaciones pueden quedar sin importe atribuible.',
    };
  }

  if (subscription.lastStatus === 'SESSION_EXPIRED') {
    return {
      subscription,
      health: 'STOPPED',
      minutesSinceLastRun: minutesSince(subscription.lastRunAt, now),
      message:
        'Parada: la sesion de LALIGA caduco. Vuelve a iniciar sesion y activala otra vez. Mientras tanto NO se estan registrando operaciones.',
    };
  }

  if (subscription.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    return {
      subscription,
      health: 'STOPPED',
      minutesSinceLastRun: minutesSince(subscription.lastRunAt, now),
      message: `Parada tras ${subscription.consecutiveFailures} intentos fallidos seguidos${
        subscription.lastError ? `: ${subscription.lastError}` : '.'
      } No se estan registrando operaciones.`,
    };
  }

  const elapsed = minutesSince(subscription.lastRunAt, now);

  if (elapsed === null) {
    return {
      subscription,
      health: 'PENDING',
      minutesSinceLastRun: null,
      message: `Activada. La primera sincronizacion automatica llegara en las proximas ${formatMinutes(EXPECTED_SYNC_INTERVAL_MINUTES)}.`,
    };
  }

  if (elapsed > EXPECTED_SYNC_INTERVAL_MINUTES * 2) {
    return {
      subscription,
      health: 'LATE',
      minutesSinceLastRun: elapsed,
      message: `Activada, pero la ultima sincronizacion fue hace ${formatMinutes(elapsed)}, mas de lo esperado (cada ${formatMinutes(EXPECTED_SYNC_INTERVAL_MINUTES)}). Puede haber operaciones sin registrar en ese hueco.`,
    };
  }

  return {
    subscription,
    health: 'OK',
    minutesSinceLastRun: elapsed,
    message: `Activada. Ultima sincronizacion hace ${formatMinutes(elapsed)}; se repite cada ${formatMinutes(EXPECTED_SYNC_INTERVAL_MINUTES)}.`,
  };
}

function minutesSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.round((now.getTime() - then) / 60_000));
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} dias`;
}

/**
 * Comprueba el secreto del cron en tiempo constante.
 *
 * Sin `CRON_SECRET` configurado devuelve `false` SIEMPRE: un endpoint que
 * dispara lecturas de la cuenta de alguien no puede quedar abierto porque falte
 * una variable de entorno.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual exige misma longitud; comparar la longitud aparte no filtra
  // nada util que no filtre ya el tamano del propio header.
  return a.length === b.length && timingSafeEqual(a, b);
}
