import type {
  League,
  LeagueTeam,
  Manager,
  MarketEntry,
  MarketValuePoint,
  StandingRow,
} from '@/src/domain/fantasy';
import { privateFetch, publicFetch } from './client';
import { COMPETITION_ID } from './config';
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
  apiLeaguesSchema,
  apiMarketSchema,
  apiMarketValueHistorySchema,
  apiStandingSchema,
  apiUserSchema,
  apiWeekSchema,
} from './schemas';

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
 *   GET /api/v3/player/{id}/market-value          (publico, sin token)
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
 * Historico diario de cotizacion de un jugador. Es un endpoint PUBLICO: no
 * consume la sesion del usuario y se puede pedir en lote sin gastar cuota
 * privada. Es la unica fuente de la tendencia que usan las alertas de clausula.
 */
export async function getMarketValueHistory(playerId: string): Promise<MarketValuePoint[]> {
  const history = await publicFetch(
    `/api/v3/player/${encodeURIComponent(playerId)}/market-value`,
    apiMarketValueHistorySchema,
  );
  return mapMarketValueHistory(history);
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
export async function getLeagueSnapshot(accessToken: string, leagueId: string): Promise<LeagueSnapshot> {
  const standing = await getLeagueStanding(accessToken, leagueId);
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

  return { standing, teams, failedTeamIds };
}
