import type {
  League,
  LeagueTeam,
  Manager,
  MarketEntry,
  MarketValuePoint,
  StandingRow,
} from '@/src/domain/fantasy';
import type { ActivityEntry } from './economy/activity';
import { collectActivityPages } from './activity-pages';
import { privateFetch, seasonFetch } from './client';
import { COMPETITION_ID } from './config';
import { apiActivitySchema } from './schemas';
import { equiposSinCaja, mezclarCajas } from './team-money.ts';
import { construirIndice, enriquecerJugadores } from './catalog-enrich.ts';
import {
  mapLeague,
  mapLeagueTeam,
  mapManager,
  mapMarketEntry,
  mapMarketValueHistory,
  mapStandingRow,
} from './mappers';
import {
  apiLeagueTeamSchema,
  apiLeagueTeamsSchema,
  apiLeaguesSchema,
  apiMarketSchema,
  apiMarketValueHistorySchema,
  apiStandingSchema,
  apiUserSchema,
  apiWeekSchema,
  apiPlayersSchema,
} from './schemas';
import { toPosition } from './mappers';
import { FALLBACK_TEAMS } from './teams';

/**
 * Lecturas de LALIGA Fantasy. Todas las que la app necesita, y ninguna mas.
 *
 * Endpoints usados (los mismos que ya estaban descubiertos y verificados con
 * cuenta real en el repositorio de referencia):
 *
 *   GET /api/v4/user/me
 *   GET /api/v1/competition/{c}/leagues
 *   GET /api/v1/competition/{c}/leagues/{id}/standing
 *   GET /api/v1/competition/{c}/leagues/{id}/teams/{teamId}
 *   GET /api/v1/competition/{c}/league/{id}/market
 *   GET /api/v1/competition/{c}/week/current
 *   GET /api/v1/competition/{c}/players           (sin token)
 *   GET /api/v1/competition/{c}/player/{id}/market-value   (sin token)
 *
 * Las dos ultimas viven en el host de la temporada en curso pero responden sin
 * `Authorization`. El host `api-fantasy`, que es el que parecia "el publico",
 * sirve todavia la temporada pasada y por eso ya no se usa para nada.
 */

const CMP = `/api/v1/competition/${COMPETITION_ID}`;

/** Perfil del manager conectado. */
export async function getMyProfile(accessToken: string): Promise<Manager> {
  return mapManager(await privateFetch('/api/v4/user/me', accessToken, apiUserSchema));
}

/** Ligas en las que participa el manager conectado. */
export async function getMyLeagues(accessToken: string): Promise<League[]> {
  const leagues = await privateFetch(`${CMP}/leagues`, accessToken, apiLeaguesSchema);
  return leagues.map(mapLeague);
}

/** Clasificacion: la lista completa de participantes de una liga. */
export async function getLeagueStanding(accessToken: string, leagueId: string): Promise<StandingRow[]> {
  const standing = await privateFetch(
    `${CMP}/leagues/${encodeURIComponent(leagueId)}/standing`,
    accessToken,
    apiStandingSchema,
  );
  const rows = Array.isArray(standing) ? standing : standing.elements;
  return rows.map(mapStandingRow).sort((a, b) => a.position - b.position);
}

/** Plantilla completa de un participante, con clausulas y caja. */
export async function getLeagueTeam(
  accessToken: string,
  leagueId: string,
  teamId: string,
): Promise<LeagueTeam> {
  const team = await privateFetch(
    `${CMP}/leagues/${encodeURIComponent(leagueId)}/teams/${encodeURIComponent(teamId)}`,
    accessToken,
    apiLeagueTeamSchema,
  );
  return mapLeagueTeam(team);
}

/** Plantillas completas en una sola petición. Algunas ligas antiguas no exponen esta variante. */
export async function getLeagueTeams(accessToken: string, leagueId: string): Promise<LeagueTeam[]> {
  const teams = await privateFetch(
    `${CMP}/leagues/${encodeURIComponent(leagueId)}/teams`,
    accessToken,
    apiLeagueTeamsSchema,
  );
  return teams.map(mapLeagueTeam);
}

/** Jugadores a la venta ahora mismo en el mercado de la liga. */
export async function getLeagueMarket(accessToken: string, leagueId: string): Promise<MarketEntry[]> {
  const market = await privateFetch(
    `${CMP}/league/${encodeURIComponent(leagueId)}/market`,
    accessToken,
    apiMarketSchema,
  );
  return market.map(mapMarketEntry).filter((entry): entry is MarketEntry => entry !== null);
}

/** Jornada en curso. */
export async function getCurrentWeek(accessToken: string): Promise<{ weekNumber: number; isLive: boolean }> {
  const week = await privateFetch(`${CMP}/week/current`, accessToken, apiWeekSchema);
  return { weekNumber: week.weekNumber, isLive: week.isLive };
}

/**
 * Historico diario de cotizacion de un jugador, DE LA TEMPORADA EN CURSO.
 *
 * Sin sesion: no consume la cuota de nadie y se puede pedir en lote. Es la unica
 * fuente de la tendencia que usan las alertas de clausula.
 *
 * ── Por que no se usa `api-fantasy/api/v3` ──────────────────────────────────
 * Porque va una temporada por detras. Medido sobre el jugador 2443:
 *
 *   api-fantasy   /api/v3/player/2443/market-value
 *                 359 puntos, del 07/07/2025 al 30/06/2026, acaba en 1,67 M€
 *   fantasy-api   /api/v1/competition/1/player/2443/market-value
 *                 47 puntos, del 29/06/2026 a HOY,          acaba en 17,13 M€
 *
 * Los 17,13 M€ son exactamente el valor que LALIGA da para ese jugador en la
 * plantilla. Con la serie vieja, la cotizacion estaba congelada desde hacia mes
 * y medio: las alertas se quedaban sin tendencia ni dias estimados y la ficha
 * dibujaba una curva de la temporada anterior.
 */
export async function getMarketValueHistory(playerId: string): Promise<MarketValuePoint[]> {
  const history = await seasonFetch(
    `${CMP}/player/${encodeURIComponent(playerId)}/market-value`,
    apiMarketValueHistorySchema,
  );
  const mapped = mapMarketValueHistory(history);
  console.info('[laliga/player-history] complete', {
    playerId,
    points: mapped.length,
    oldest: mapped[0]?.date ?? null,
    newest: mapped.at(-1)?.date ?? null,
  });
  return mapped;
}

/**
 * Catalogo completo de la temporada en curso: fotos, equipo de cada jugador y
 * cruce con fuentes externas. Mismo cambio de host y por el mismo motivo que el
 * historico: el de `api-fantasy` daba el valor y los puntos del año pasado.
 *
 * Se guarda unos minutos en memoria del proceso porque es el mismo para todo el
 * mundo y son ~730 jugadores: pedirlo tres veces en la misma peticion
 * (plantillas, alertas, economia) es tirar tiempo. No es cache de usuario, aqui
 * no hay datos de nadie.
 */
let catalogoEnMemoria: { at: number; players: import('@/src/domain/fantasy').Player[] } | null = null;
const CATALOGO_TTL_MS = 5 * 60_000;

export async function getPlayerCatalog(): Promise<import('@/src/domain/fantasy').Player[]> {
  if (catalogoEnMemoria && Date.now() - catalogoEnMemoria.at < CATALOGO_TTL_MS) {
    return catalogoEnMemoria.players;
  }
  const players = await seasonFetch(`${CMP}/players`, apiPlayersSchema);
  const catalogo = players.flatMap((player) => {
    const position = toPosition(player.positionId);
    if (!position) return [];
    return [{
      id: player.id,
      name: player.nickname,
      team: FALLBACK_TEAMS[player.teamId]?.shortName ?? '—',
      teamId: player.teamId,
      position,
      marketValue: player.marketValue,
      points: player.points,
      averagePoints: player.averagePoints,
      status: player.playerStatus,
      image: player.image,
      lastSeasonPoints: player.lastSeasonPoints,
    }];
  });
  catalogoEnMemoria = { at: Date.now(), players: catalogo };
  return catalogo;
}

export type LeagueSnapshot = {
  standing: StandingRow[];
  teams: LeagueTeam[];
  /** Participantes cuya plantilla no se pudo leer. Se informa, no se oculta. */
  failedTeamIds: string[];
};

/**
 * Clasificacion + plantilla de CADA participante. Es la lectura base de la app:
 * de aqui salen la pantalla Liga, las alertas de clausula, la exportacion de
 * equipos y el saldo real de cada manager.
 *
 * Si falla la plantilla de un participante concreto, el resto sigue siendo util:
 * se devuelve su id en `failedTeamIds` para que la UI diga que esa parte falta,
 * en vez de presentar una liga incompleta como si estuviera entera.
 */
/**
 * Pide por separado la caja de los equipos a los que el listado plural no se la
 * pone. Ver `team-money.ts` para el porque.
 *
 * Nunca falla hacia fuera: si una consulta se cae, ese equipo simplemente sigue
 * sin caja conocida, que es como estaba.
 */
/**
 * Rellena con el catalogo los datos de jugador que la liga no trae (equipo,
 * foto). Ver `catalog-enrich.ts`. Si el catalogo falla, se sigue sin el: es una
 * mejora, no un requisito.
 */
async function completarJugadores(teams: LeagueTeam[]): Promise<LeagueTeam[]> {
  let indice;
  try {
    indice = construirIndice(await getPlayerCatalog());
  } catch {
    return teams;
  }
  return teams.map((team) => ({ ...team, players: enriquecerJugadores(team.players, indice) }));
}

async function completarCajas(
  accessToken: string,
  leagueId: string,
  teams: LeagueTeam[],
): Promise<LeagueTeam[]> {
  const pendientes = equiposSinCaja(teams);
  if (pendientes.length === 0) return teams;

  const resultados = await Promise.allSettled(
    pendientes.map((team) => getLeagueTeam(accessToken, leagueId, team.teamId)),
  );
  const encontradas = new Map<string, number | undefined>();
  resultados.forEach((resultado, index) => {
    const teamId = pendientes[index]?.teamId;
    if (teamId && resultado.status === 'fulfilled') encontradas.set(teamId, resultado.value.teamMoney);
  });

  return mezclarCajas(teams, encontradas);
}

export async function getLeagueSnapshot(accessToken: string, leagueId: string): Promise<LeagueSnapshot> {
  const standingPromise = getLeagueStanding(accessToken, leagueId);
  try {
    const [standing, teams] = await Promise.all([standingPromise, getLeagueTeams(accessToken, leagueId)]);
    const completos = await completarJugadores(await completarCajas(accessToken, leagueId, teams));
    return { standing, teams: completos, failedTeamIds: [] };
  } catch {
    // Compatibilidad: si LALIGA retira la ruta plural, seguimos pudiendo leer
    // la liga equipo a equipo e informar exactamente de los que fallen.
  }
  const standing = await standingPromise;
  const settled = await Promise.allSettled(
    standing.map((row) => getLeagueTeam(accessToken, leagueId, row.teamId)),
  );

  const teams: LeagueTeam[] = [];
  const failedTeamIds: string[] = [];
  settled.forEach((result, index) => {
    const row = standing[index];
    if (!row) return;
    if (result.status === 'fulfilled') teams.push(result.value);
    else failedTeamIds.push(row.teamId);
  });

  return { standing, teams: await completarJugadores(teams), failedTeamIds };
}

/** Operaciones economicas desde el principio de la liga, con importe publicado por LALIGA. */
export async function getLeagueActivity(
  accessToken: string,
  leagueId: string,
): Promise<ActivityEntry[]> {
  const base = `${CMP}/leagues/${encodeURIComponent(leagueId)}/activity`;
  let pagesWithData = 0;
  const activity = await collectActivityPages(async (index) => {
    const raw = await privateFetch(`${base}/${index}`, accessToken, apiActivitySchema);
    return raw.map((entry) => ({
      id: entry.id,
      activityTypeId: entry.activityTypeId,
      user1Id: entry.user1Id,
      user2Id: entry.user2Id ?? undefined,
      playerMasterId: entry.playerMasterId,
      amount: entry.amount,
      createdAt: entry.createdAt,
    }));
  }, (page) => {
    if (page.count > 0) pagesWithData += 1;
    console.info('[laliga/activity] page', { leagueId, ...page });
  });
  const dates = activity.map((entry) => entry.createdAt).sort();
  console.info('[laliga/activity] complete', {
    leagueId,
    pages: pagesWithData,
    entries: activity.length,
    oldest: dates[0] ?? null,
    newest: dates.at(-1) ?? null,
  });
  return activity;
}
