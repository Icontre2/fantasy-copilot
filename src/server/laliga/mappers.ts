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

const IMAGE_KEY = /(avatar|image|img|photo|picture|portrait|thumbnail|profile|media)/i;
const DIRECT_IMAGE_KEY = /^(avatar|avatarUrl|image|imageUrl|img|imgUrl|photo|photoUrl|picture|profileImage|profileImageUrl|profilePicture|thumbnail)$/i;

function cleanImageUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (!url) return '';
  if (/^(https?:\/\/|data:image\/|\/\/)/i.test(url)) return url;
  return '';
}

/**
 * LALIGA ha cambiado varias veces la forma del perfil de manager. En algunos
 * endpoints la imagen llega plana y en otros puede venir anidada. Recorremos
 * solo ramas cuyo nombre parece relacionado con imagen/perfil y limitamos la
 * profundidad para no confundir cualquier URL del objeto con una foto.
 */
function nestedImageUrl(value: unknown, depth = 0): string {
  if (depth > 5 || value === null || value === undefined) return '';

  const direct = cleanImageUrl(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = nestedImageUrl(item, depth + 1);
      if (found) return found;
    }
    return '';
  }

  if (typeof value !== 'object') return '';
  const object = value as Record<string, unknown>;

  // Primero, las claves de imagen explícitas.
  for (const [key, candidate] of Object.entries(object)) {
    if (!DIRECT_IMAGE_KEY.test(key)) continue;
    const found = nestedImageUrl(candidate, depth + 1);
    if (found) return found;
  }

  // Después, contenedores semánticos como profile/media/images.
  for (const [key, candidate] of Object.entries(object)) {
    if (!IMAGE_KEY.test(key)) continue;
    const found = nestedImageUrl(candidate, depth + 1);
    if (found) return found;
  }

  return '';
}

function managerAvatar(api: ApiManagerLike | ApiUser): string {
  const raw = api as unknown as Record<string, unknown>;

  // Mantiene prioridad sobre las variantes conocidas para no cambiar una foto
  // válida si LALIGA añade otros metadatos al mismo objeto.
  const preferred = [
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
    raw.profile,
    raw.media,
  ];

  for (const candidate of preferred) {
    const found = nestedImageUrl(candidate);
    if (found) return found;
  }

  // Último recurso: busca ramas semánticas desconocidas conservadas por el
  // `.passthrough()` del schema. No acepta URLs de claves no relacionadas con
  // imágenes, así que no puede acabar pintando enlaces de perfil como avatar.
  return nestedImageUrl(raw);
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
