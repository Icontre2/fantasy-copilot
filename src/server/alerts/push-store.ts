import { supabaseAdmin } from '@/src/server/storage/supabase-admin';
import type { AlertLevel } from '../laliga/alerts/clause-alerts.ts';
import type { EstadoAlertas } from './notify-diff.ts';

/**
 * Todo lo que este sistema guarda en la base de datos: suscripciones push y el
 * estado de que ya se avisó. Vive aparte de las rutas para que ellas no
 * conozcan la forma de las tablas.
 *
 * Requiere el almacen persistente (ver `hasPersistentStorage()` en
 * `session.ts`): sin el no hay donde guardar ni la suscripcion ni la memoria
 * de que ya se avisó, y el cron no tiene sesiones que evaluar sin sesion
 * persistente en primer lugar. Es la misma dependencia, no una nueva.
 */

export type Suscripcion = { endpoint: string; p256dh: string; auth: string };

export async function guardarSuscripcion(
  sessionId: string,
  leagueId: string,
  sub: Suscripcion,
): Promise<void> {
  const { error } = await supabaseAdmin().from('push_subscriptions').upsert(
    { session_id: sessionId, league_id: leagueId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
    { onConflict: 'session_id,league_id,endpoint' },
  );
  if (error) throw new Error(`No se pudo guardar la suscripción: ${error.message}`);
}

export async function borrarSuscripcion(sessionId: string, leagueId: string, endpoint: string): Promise<void> {
  await supabaseAdmin()
    .from('push_subscriptions')
    .delete()
    .match({ session_id: sessionId, league_id: leagueId, endpoint });
}

/** Todas las combinaciones sesión+liga que tienen al menos una suscripción activa. */
export async function ligasConSuscripcion(): Promise<Array<{ sessionId: string; leagueId: string }>> {
  const { data, error } = await supabaseAdmin().from('push_subscriptions').select('session_id, league_id');
  if (error) throw new Error(`No se pudo leer las suscripciones: ${error.message}`);

  // Varios dispositivos suscritos a la misma sesión+liga cuentan una sola vez
  // aquí: el envío a cada dispositivo se hace aparte, en `suscripcionesDe`.
  const vistas = new Set<string>();
  const salida: Array<{ sessionId: string; leagueId: string }> = [];
  for (const fila of data ?? []) {
    const clave = `${fila.session_id}:${fila.league_id}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push({ sessionId: fila.session_id, leagueId: fila.league_id });
  }
  return salida;
}

export async function suscripcionesDe(sessionId: string, leagueId: string): Promise<Suscripcion[]> {
  const { data, error } = await supabaseAdmin()
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .match({ session_id: sessionId, league_id: leagueId });
  if (error) throw new Error(`No se pudo leer las suscripciones: ${error.message}`);
  return (data ?? []).map((fila) => ({ endpoint: fila.endpoint, p256dh: fila.p256dh, auth: fila.auth }));
}

export async function leerEstadoDeAlertas(sessionId: string, leagueId: string): Promise<EstadoAlertas> {
  const { data, error } = await supabaseAdmin()
    .from('fantasy_alert_state')
    .select('player_id, level')
    .match({ session_id: sessionId, league_id: leagueId });
  if (error) throw new Error(`No se pudo leer el estado de alertas: ${error.message}`);
  return new Map((data ?? []).map((fila) => [fila.player_id, fila.level as AlertLevel]));
}

/**
 * Reemplaza el estado guardado entero por el nuevo.
 *
 * No se fusiona con lo que hubiera: un jugador que ya no está en `estado`
 * significa que ya no aparece en el informe, y tiene que desaparecer también
 * de la memoria — si no, un jugador vendido hace semanas seguiría "recordado"
 * para siempre y, si algún día otro jugador reutilizara ese id, heredaría un
 * historial que no es suyo.
 */
export async function guardarEstadoDeAlertas(
  sessionId: string,
  leagueId: string,
  estado: EstadoAlertas,
): Promise<void> {
  const db = supabaseAdmin();
  const { error: delError } = await db
    .from('fantasy_alert_state')
    .delete()
    .match({ session_id: sessionId, league_id: leagueId });
  if (delError) throw new Error(`No se pudo limpiar el estado de alertas: ${delError.message}`);

  if (estado.size === 0) return;

  const filas = [...estado.entries()].map(([playerId, level]) => ({
    session_id: sessionId,
    league_id: leagueId,
    player_id: playerId,
    level,
    notified_at: new Date().toISOString(),
  }));
  const { error: insError } = await db.from('fantasy_alert_state').insert(filas);
  if (insError) throw new Error(`No se pudo guardar el estado de alertas: ${insError.message}`);
}

/** Todas las sesiones activas (no caducadas), para que el cron sepa a quién evaluar. */
export async function sesionesActivas(): Promise<string[]> {
  const { data, error } = await supabaseAdmin()
    .from('fantasy_sessions')
    .select('id')
    .gt('expires_at', new Date().toISOString());
  if (error) throw new Error(`No se pudo listar las sesiones: ${error.message}`);
  return (data ?? []).map((fila) => fila.id as string);
}
