import { getValidAccessToken } from '../laliga/session.ts';
import { buildClauseAlertsReport } from '../laliga/alerts/build.ts';
import { diferenciarAlertas } from './notify-diff.ts';
import { mensajeDeAlerta } from './notify-message.ts';
import { configVapid, mandarPush } from './push-send.ts';
import {
  borrarSuscripcion,
  guardarEstadoDeAlertas,
  guardarEstadoDeDefensa,
  leerEstadoDeAlertas,
  leerEstadoDeDefensa,
  marcarAvisado,
  suscripcionesDe,
  yaAvisado,
  type Suscripcion,
} from './push-store.ts';
import { getCalendar, getCurrentWeekPublic, getLeagueActivity, getLeagueSnapshot, getMyProfile, getPlayerCatalog } from '../laliga/read.ts';
import { conProbabilidades } from '../laliga/probable-lineup.ts';
import { bestEleven } from '../laliga/lineup.ts';
import { getCuotas } from '../odds/football-data.ts';
import { dificultadPorEquipo } from '../odds/team-difficulty.ts';
import { FALLBACK_TEAMS } from '../laliga/teams.ts';
import { cambiosSugeridos, onceDado, onceOptimo, predecirJugadores } from '../../../app/fantasy/prediccion.ts';
import { clavePrevia, mensajeDePrevia, primerPartido, tocaPrevia } from './previa.ts';
import { buildEconomy } from '../laliga/economy/activity.ts';
import { analizarDefensa, compradoresDeLiga } from '../../../app/fantasy/defensa.ts';
import { diferenciarDefensa, mensajeDeDefensa } from './defensa-diff.ts';
import type { ConfigVapid } from './push-send.ts';
import type { NotificacionPush } from './notify-message.ts';

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

  const mensajes: NotificacionPush[] = aAvisar.map((cambio) =>
    mensajeDeAlerta(cambio.alert, cambio.alert.owner.managerId === informe.myManagerId, leagueId),
  );

  /*
   * Defensa va aparte y protegida: si falla (la actividad de la liga no
   * responde, por ejemplo), las alertas de cláusula se mandan igual.
   */
  let defensa: Awaited<ReturnType<typeof evaluarDefensa>> | null = null;
  try {
    defensa = await evaluarDefensa(token, sessionId, leagueId);
    mensajes.push(...defensa.mensajes);
  } catch {
    defensa = null;
  }

  const primero = await enviarATodas(vapid, sessionId, leagueId, suscripciones, mensajes);

  // El estado se guarda SIEMPRE, avise o no: es lo que permite detectar la
  // próxima subida de nivel, y también lo que olvida a los jugadores que ya no
  // aparecen en el informe.
  await guardarEstadoDeAlertas(sessionId, leagueId, estadoNuevo);
  if (defensa) await guardarEstadoDeDefensa(sessionId, leagueId, defensa.estadoNuevo);

  /*
   * La víspera va DESPUÉS de mandar lo anterior, y aparte: si algo de aquí se
   * alarga o falla, las alertas de cláusula y de defensa ya han salido.
   */
  let previa = { enviosOk: 0, enviosFallidos: 0, avisos: 0 };
  try {
    const p = await evaluarPrevia(token, sessionId, leagueId);
    if (p) {
      const r = await enviarATodas(vapid, sessionId, leagueId, suscripciones, [p.mensaje]);
      if (r.enviosOk > 0) await marcarAvisado(sessionId, leagueId, clavePrevia(p.jornada));
      previa = { ...r, avisos: 1 };
    }
  } catch {
    // Sin víspera esta hora; el repaso de la próxima hora lo vuelve a intentar.
  }

  return {
    estado: 'EVALUADO',
    avisos: mensajes.length + previa.avisos,
    enviosOk: primero.enviosOk + previa.enviosOk,
    enviosFallidos: primero.enviosFallidos + previa.enviosFallidos,
  };
}

/**
 * La víspera de la jornada: el mejor once con sus puntos ≈ y qué cambiar.
 * `null` si no toca (fuera de la ventana o ya avisada).
 *
 * Usa las MISMAS piezas que la pantalla Plantilla —probabilidad de titular,
 * cuotas de la jornada, `predecirJugadores`, `onceOptimo`— para que el aviso
 * y la pantalla digan lo mismo.
 */
async function evaluarPrevia(token: string, sessionId: string, leagueId: string) {
  const ahora = new Date();
  const actual = await getCurrentWeekPublic();

  // La jornada que viene: la actual si aún no ha empezado; si ya empezó, la siguiente.
  let jornada = actual.weekNumber;
  let partidos = await getCalendar(jornada);
  let inicio = primerPartido(partidos.map((p) => p.kickoff));
  if (inicio === null || inicio <= ahora.getTime()) {
    jornada += 1;
    partidos = await getCalendar(jornada).catch(() => []);
    inicio = primerPartido(partidos.map((p) => p.kickoff));
  }
  if (inicio === null || !tocaPrevia(inicio, ahora)) return null;
  if (await yaAvisado(sessionId, leagueId, clavePrevia(jornada))) return null;

  const [snapshot, perfil, catalogo, cuotas] = await Promise.all([
    getLeagueSnapshot(token, leagueId),
    getMyProfile(token),
    getPlayerCatalog(),
    getCuotas(Object.values(FALLBACK_TEAMS)),
  ]);
  const mio = snapshot.teams.find((team) => team.manager.id === perfil.id);
  if (!mio) return null;

  const jugadores = await conProbabilidades(mio.players, catalogo);
  const dificultad = dificultadPorEquipo(partidos.map((partido) => ({
    ...partido,
    odds: cuotas?.find((c) => c.localId === partido.local?.id && c.visitorId === partido.visitor?.id) ?? null,
  })));
  const predichos = predecirJugadores(jugadores, dificultad, jornada);
  const optimo = onceOptimo(predichos);
  if (!optimo) return null;
  const probable = bestEleven(jugadores);
  const actualOnce = onceDado(probable.formation, probable.starters.map((p) => p.id), predichos);
  return {
    jornada,
    mensaje: mensajeDePrevia({ jornada, inicio, ahora, optimo, actual: actualOnce, cambios: cambiosSugeridos(actualOnce, optimo), leagueId }),
  };
}

async function enviarATodas(
  vapid: ConfigVapid,
  sessionId: string,
  leagueId: string,
  suscripciones: Suscripcion[],
  mensajes: NotificacionPush[],
): Promise<{ enviosOk: number; enviosFallidos: number }> {
  let enviosOk = 0;
  let enviosFallidos = 0;
  const muertas = new Set<string>();
  for (const mensaje of mensajes) {
    for (const sub of suscripciones) {
      if (muertas.has(sub.endpoint)) continue;
      const resultado = await mandarPush(vapid, sub, mensaje);
      if (resultado.ok) {
        enviosOk += 1;
      } else {
        enviosFallidos += 1;
        // El dispositivo ya no existe: seguir intentando es tirar peticiones a
        // la nada, así que se borra en vez de reintentar para siempre.
        if (resultado.suscripcionMuerta) {
          muertas.add(sub.endpoint);
          await borrarSuscripcion(sessionId, leagueId, sub.endpoint);
        }
      }
    }
  }
  return { enviosOk, enviosFallidos };
}

/**
 * Defensa en el repaso diario: el mismo cálculo que la pantalla
 * (`app/fantasy/defensa.ts`), con la caja de cada rival reconstruida igual que
 * en Economía, y avisando solo de los rivales que ANTES no llegaban.
 */
async function evaluarDefensa(token: string, sessionId: string, leagueId: string) {
  const [snapshot, activity, perfil, anterior] = await Promise.all([
    getLeagueSnapshot(token, leagueId),
    getLeagueActivity(token, leagueId),
    getMyProfile(token),
    leerEstadoDeDefensa(sessionId, leagueId),
  ]);
  const economias = buildEconomy({
    managers: snapshot.teams.map((team) => ({
      managerId: team.manager.id,
      managerName: team.manager.name,
      puntos: snapshot.standing.find((row) => row.teamId === team.teamId)?.points ?? team.teamPoints ?? 0,
      cajaOficial: team.teamMoney ?? null,
      clausePlayers: team.players.map((p) => ({ id: p.id, name: p.name, marketValue: p.marketValue, buyoutClause: p.buyoutClause })),
    })),
    activity,
  });
  const mio = snapshot.teams.find((team) => team.manager.id === perfil.id);
  if (!mio) return { mensajes: [], estadoNuevo: anterior };

  const rivales = snapshot.teams.filter((team) => team.manager.id !== perfil.id);
  const compradores = compradoresDeLiga(rivales, economias);
  const miCaja = mio.teamMoney ?? economias.find((e) => e.managerId === perfil.id)?.cajaReconstruida ?? null;
  const defensas = analizarDefensa(mio.players, compradores, miCaja, new Date());
  const { aAvisar, estadoNuevo } = diferenciarDefensa(anterior, defensas);
  return { mensajes: aAvisar.map((aviso) => mensajeDeDefensa(aviso, leagueId)), estadoNuevo };
}
