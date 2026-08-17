import { getValidAccessToken } from '../laliga/session.ts';
import { buildClauseAlertsReport } from '../laliga/alerts/build.ts';
import { diferenciarAlertas } from './notify-diff.ts';
import { mensajeDeAlerta } from './notify-message.ts';
import { configVapid, mandarPush } from './push-send.ts';
import {
  borrarSuscripcion,
  guardarEstadoDeAlertas,
  leerEstadoDeAlertas,
  suscripcionesDe,
} from './push-store.ts';

/**
 * Evalúa las alertas de UNA sesión y UNA liga, y manda las que toquen.
 *
 * Es la pieza que junta todo lo demás; a propósito no tiene lógica propia que
 * decidir, solo orquesta: pedir el token, construir el informe (el mismo que
 * usa la pantalla de Alertas — ni una fórmula distinta, ni un criterio
 * aparte), comparar con lo ya avisado, mandar, guardar.
 */

export type ResultadoEjecucion =
  | { estado: 'SIN_TOKEN' }
  | { estado: 'SIN_SUSCRIPCIONES' }
  | { estado: 'EVALUADO'; avisos: number; enviosOk: number; enviosFallidos: number };

export async function evaluarYAvisar(sessionId: string, leagueId: string): Promise<ResultadoEjecucion> {
  const vapid = configVapid();
  if (!vapid) throw new Error('Faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.');

  const suscripciones = await suscripcionesDe(sessionId, leagueId);
  if (suscripciones.length === 0) return { estado: 'SIN_SUSCRIPCIONES' };

  const token = await getValidAccessToken(sessionId);
  if (!token) return { estado: 'SIN_TOKEN' };

  const [informe, anterior] = await Promise.all([
    buildClauseAlertsReport(token, leagueId),
    leerEstadoDeAlertas(sessionId, leagueId),
  ]);

  const { aAvisar, estadoNuevo } = diferenciarAlertas(anterior, informe.alerts);

  let enviosOk = 0;
  let enviosFallidos = 0;

  for (const cambio of aAvisar) {
    const esTuyo = cambio.alert.owner.managerId === informe.myManagerId;
    const mensaje = mensajeDeAlerta(cambio.alert, esTuyo, leagueId);

    for (const sub of suscripciones) {
      const resultado = await mandarPush(vapid, sub, mensaje);
      if (resultado.ok) {
        enviosOk += 1;
      } else {
        enviosFallidos += 1;
        // El dispositivo ya no existe: seguir intentando es tirar peticiones a
        // la nada, así que se borra en vez de reintentar para siempre.
        if (resultado.suscripcionMuerta) await borrarSuscripcion(sessionId, leagueId, sub.endpoint);
      }
    }
  }

  // El estado se guarda SIEMPRE, avise o no: es lo que permite detectar la
  // próxima subida de nivel, y también lo que olvida a los jugadores que ya no
  // aparecen en el informe.
  await guardarEstadoDeAlertas(sessionId, leagueId, estadoNuevo);

  return { estado: 'EVALUADO', avisos: aAvisar.length, enviosOk, enviosFallidos };
}
