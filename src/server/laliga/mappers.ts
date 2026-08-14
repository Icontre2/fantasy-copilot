import type {
  League,
  LeagueTeam,
  Manager,
  MarketEntry,
  MarketValuePoint,
  Player,
  Position,
  SquadPlayer,
  StandingRow,
} from '@/src/domain/fantasy';
import type {
  ApiLeague,
  ApiLeagueTeam,
  ApiManagerLike,
  ApiMarketItem,
  ApiMarketValuePoint,
  ApiPlayerMaster,
  ApiStandingRow,
  ApiTeamPlayer,
  ApiUser,
} from './schemas';
import { resolveTeamId, shortTeamName } from './player-team.ts';

/**
 * Traduccion de la API de LALIGA al dominio de la app.
 *
 * Aqui no se calcula nada: no hay "forma estimada", ni proyecciones, ni
 * indicadores. Solo se cambia de forma un dato que ya venia de LALIGA. Todo lo
 * que la app calcula por su cuenta vive en `alerts/` y `economy/`, donde queda
 * separado y auditable.
 */

/** `positionId` 5 son entrenadores: se filtran porque no son jugadores de campo. */
const POSITION_BY_ID: Record<string, Position | 'ENT'> = {
  '1': 'POR',
  '2': 'DEF',
  '3': 'MED',
  '4': 'DEL',
  '5': 'ENT',
};

export function toPosition(positionId: string): Position | null {
  const mapped = POSITION_BY_ID[positionId];
  return mapped && mapped !== 'ENT' ? mapped : null;
}

export function mapManager(api: ApiManagerLike | ApiUser): Manager {
  return { id: api.id, name: api.managerName, avatar: api.avatar ?? '' };
}

export function mapLeague(api: ApiLeague): League {
  return {
    id: api.id,
    name: api.name,
    access: api.access,
    managersNumber: api.managersNumber ?? 0,
    myTeamId: api.team?.id,
  };
}

export function mapStandingRow(api: ApiStandingRow): StandingRow {
  return {
    position: api.position,
    previousPosition: api.previousPosition,
    points: api.points,
    livePoints: api.livePoints ?? api.points,
    teamId: api.team.id,
    manager: mapManager(api.team.manager),
    teamValue: api.team.teamValue,
  };
}


export function mapPlayerMaster(pm: ApiPlayerMaster): Player | null {
  const position = toPosition(pm.positionId);
  if (!position) return null;

  // Anidado o plano, lo que venga. Sin esto el jugador se quedaba sin `teamId` y
  // con el se cae en cadena la probabilidad de titularidad, que se busca por
  // equipo. Ver `player-team.ts`.
  const teamId = resolveTeamId(pm.team?.id, pm.teamId);

  return {
    id: pm.id,
    name: pm.nickname,
    team: shortTeamName(teamId, pm.team?.name),
    teamId,
    position,
    marketValue: pm.marketValue,
    points: pm.points,
    averagePoints: pm.averagePoints,
    status: pm.playerStatus,
    image: pm.images?.transparent?.['256x256'],
    lastSeasonPoints: pm.lastSeasonPoints ?? undefined,
  };
}

export function mapSquadPlayer(api: ApiTeamPlayer): SquadPlayer | null {
  const base = mapPlayerMaster(api.playerMaster);
  if (!base) return null;
  // `buyoutClause` se propaga tal cual: si la API no la trae, queda undefined y
  // aguas abajo se trata como "clausula desconocida", nunca como 0.
  return {
    ...base,
    buyoutClause: api.buyoutClause,
    isShielded: api.isShielded,
    shieldedUntil: api.buyoutClauseLockedEndTime,
  };
}

const POSITION_ORDER: Record<Position, number> = { POR: 0, DEF: 1, MED: 2, DEL: 3 };

export function mapLeagueTeam(api: ApiLeagueTeam): LeagueTeam {
  const players = api.players
    .map(mapSquadPlayer)
    .filter((player): player is SquadPlayer => player !== null)
    .sort(
      (a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || b.marketValue - a.marketValue,
    );

  return {
    teamId: api.id,
    manager: mapManager(api.manager),
    teamMoney: api.teamMoney ?? undefined,
    teamValue: api.teamValue ?? undefined,
    teamPoints: api.teamPoints ?? undefined,
    players,
  };
}

export function mapMarketEntry(api: ApiMarketItem): MarketEntry | null {
  const player = mapPlayerMaster(api.playerMaster);
  if (!player) return null;
  return {
    marketId: api.id,
    player,
    salePrice: api.salePrice,
    numberOfBids: api.numberOfBids,
    expiresAt: api.expirationDate,
    sellerKind: api.discr,
    myBid: api.bid ? { bidId: api.bid.id, amount: api.bid.money } : undefined,
  };
}

export function mapMarketValueHistory(history: ApiMarketValuePoint[]): MarketValuePoint[] {
  return history
    .map((point) => ({ date: point.date, marketValue: point.marketValue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
