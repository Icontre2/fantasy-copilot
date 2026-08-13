import type { MarketValuePoint } from '@/src/domain/fantasy';
import { getLeagueSnapshot, getMarketValueHistory } from '../read.ts';
import {
  buildClauseAlerts,
  MAX_HISTORY_AGE_DAYS,
  type ClauseAlert,
  type OwnedPlayer,
} from './clause-alerts.ts';

/**
 * Construccion de las alertas de clausula de una liga completa.
 *
 * ── Por que hay un prefiltro ─────────────────────────────────────────────────
 * La tendencia sale del historico de cotizacion, y eso es UNA peticion por
 * jugador. Una liga de 20 managers con ~24 jugadores cada uno son ~480
 * peticiones por refresco: demasiadas para pedirlas todas cada vez.
 *
 * El prefiltro usa el unico criterio que no necesita historico: la relacion
 * entre valor y clausula, que ya viene en la respuesta de las plantillas. Solo
 * se descarga el historico de quien ya esta razonablemente cerca.
 *
 * Lo que esto CUESTA, y por eso se informa en la respuesta: un jugador muy lejos
 * de su clausula pero subiendo como un cohete no aparecera como INFORMATIVA
 * hasta que se acerque. Es una limitacion de cobertura conocida, no un fallo, y
 * `skippedForBudget` dice cuantos jugadores se han quedado fuera para que la UI
 * pueda decirlo en vez de aparentar que la lista esta completa.
 */

/**
 * Valor minimo respecto a la clausula para molestarse en pedir el historico.
 * Por debajo del 60% harian falta semanas de subida sostenida para que la
 * clausula fuera alcanzable.
 */
export const PREFILTER_VALUE_RATIO = 0.6;

/** Tope de peticiones de historico por refresco. */
export const MAX_HISTORY_REQUESTS = 150;

/** Peticiones simultaneas al host publico. Conservador: no se ha medido su limite. */
const CONCURRENCY = 6;

/** Ejecuta `task` sobre cada elemento con un maximo de tareas en vuelo. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      const item = items[index];
      if (item === undefined) return;
      results[index] = await task(item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export type ClauseAlertsReport = {
  leagueId: string;
  alerts: ClauseAlert[];
  /** Jugadores con clausula publicada considerados. */
  playersWithClause: number;
  /** Jugadores SIN clausula publicada: no se les puede evaluar. */
  playersWithoutClause: number;
  /** Descartados por el prefiltro o por el tope de peticiones. */
  skippedForBudget: number;
  /** Jugadores cuyo historico no se pudo descargar: sin tendencia. */
  historyFailures: number;
  /**
   * Jugadores cuyo historico existe pero esta congelado (ultimo dato demasiado
   * viejo). Siguen alertando por cercania a la clausula, pero SIN tendencia.
   */
  staleHistories: number;
  failedTeamIds: string[];
  dataNotes: string[];
};

export async function buildClauseAlertsReport(
  accessToken: string,
  leagueId: string,
): Promise<ClauseAlertsReport> {
  const league = await getLeagueSnapshot(accessToken, leagueId);

  const candidates: OwnedPlayer[] = [];
  let playersWithoutClause = 0;

  for (const team of league.teams) {
    for (const player of team.players) {
      if (player.buyoutClause === undefined || player.buyoutClause <= 0) {
        playersWithoutClause += 1;
        continue;
      }
      candidates.push({
        player,
        owner: { teamId: team.teamId, managerId: team.manager.id, managerName: team.manager.name },
        history: [],
      });
    }
  }

  // Los mas cerca de su clausula primero: si el tope recorta, recorta por abajo.
  const ranked = [...candidates].sort(
    (a, b) =>
      b.player.marketValue / (b.player.buyoutClause ?? 1) -
      a.player.marketValue / (a.player.buyoutClause ?? 1),
  );

  const selected = ranked
    .filter((entry) => entry.player.marketValue / (entry.player.buyoutClause ?? 1) >= PREFILTER_VALUE_RATIO)
    .slice(0, MAX_HISTORY_REQUESTS);

  let historyFailures = 0;
  const histories = await mapWithConcurrency(selected, CONCURRENCY, async (entry) => {
    try {
      return await getMarketValueHistory(entry.player.id);
    } catch {
      // Un historico que falla deja al jugador sin tendencia, no fuera del
      // informe: puede seguir alertando por su ratio de valor.
      historyFailures += 1;
      return [] as MarketValuePoint[];
    }
  });

  selected.forEach((entry, index) => {
    entry.history = histories[index] ?? [];
  });

  const alerts = buildClauseAlerts(selected);
  const staleHistories = alerts.filter(
    (alert) => alert.calculated.missingReason === 'historico_desactualizado',
  ).length;

  // La fecha del dato mas reciente que hemos visto de cualquier jugador. Sirve
  // para decir "la cotizacion va hasta el X" en vez de dejarlo a la imaginacion.
  const latestHistoryDate = alerts
    .map((alert) => alert.calculated.historyLatestDate)
    .filter((date): date is string => date !== null)
    .sort()
    .at(-1);

  return {
    leagueId,
    alerts,
    playersWithClause: candidates.length,
    playersWithoutClause,
    skippedForBudget: candidates.length - selected.length,
    historyFailures,
    staleHistories,
    failedTeamIds: league.failedTeamIds,
    dataNotes: [
      'Valor de mercado y clausula son datos oficiales de LALIGA. El hueco, la tendencia diaria y los dias estimados los calcula esta app.',
      'Los dias estimados asumen que la subida reciente se mantiene igual. Es un escenario, no un pronostico: no hay ningun modelo detras, solo hueco dividido entre subida diaria.',
      `Solo se consulta el historico de cotizacion de los jugadores cuyo valor ya supera el ${Math.round(PREFILTER_VALUE_RATIO * 100)}% de su clausula, con un tope de ${MAX_HISTORY_REQUESTS} por refresco.`,
      playersWithoutClause > 0
        ? `${playersWithoutClause} jugador(es) no tienen clausula publicada por LALIGA y no se pueden evaluar.`
        : 'Todos los jugadores de la liga tienen clausula publicada.',
      staleHistories > 0
        ? `${staleHistories} jugador(es) se muestran SIN tendencia ni dias estimados: su ultimo dato de cotizacion tiene mas de ${MAX_HISTORY_AGE_DAYS} dias${
            latestHistoryDate ? ` (la serie llega al ${latestHistoryDate.slice(0, 10)})` : ''
          }. Entre temporadas la serie publica se congela; calcular una "subida diaria" con eso seria presentar dato viejo como actual.`
        : 'La cotizacion usada para las tendencias esta al dia.',
    ],
  };
}
