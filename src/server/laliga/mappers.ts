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

function imageUrl(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';

  const object = value as Record<string, unknown>;
  const preferredKeys = [
    'url',
    'src',
    'avatar',
    'image',
    'profileImage',
    'profilePicture',
    'picture',
    'original',
    'large',
    'medium',
    'small',
    '256x256',
    '128x128',
  ];

  for (const key of preferredKeys) {
    const found = imageUrl(object[key]);
    if (found) return found;
  }

  return '';
}

function managerAvatar(api: ApiManagerLike | ApiUser): string {
  const raw = api as unknown as Record<string, unknown>;
  const candidates = [
    raw.avatar,
    raw.avatarUrl,
    raw.image,
    raw.imageUrl,
    raw.profileImage,
    raw.profileImageUrl,
    raw.profilePicture,
    raw.picture,
    raw.photo,
    raw.photoUrl,
    raw.images,
  ];

  for (const candidate of candidates) {
    const resolved = imageUrl(candidate);
    if (resolved) return resolved;
  }

  return '';
}

export function mapManager(api: ApiManagerLike | ApiUser): Manager {
  return { id: api.id, name: api.managerName, avatar: managerAvatar(api) };
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
