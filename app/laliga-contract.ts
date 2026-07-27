export type LaligaPosition = "GK" | "DEF" | "MID" | "FWD";

export type LaligaLeague = {
  id: string;
  name: string;
  teamId: string;
  balance: number | null;
  squadValue: number | null;
  squadCount: number;
};

export type LaligaSquadItem = {
  name: string;
  position: LaligaPosition;
  club: string | null;
  current_value: number | null;
  external_player_id: string;
  external_player_team_id: string | null;
  is_starter: boolean;
};

export type LaligaMarketItem = {
  name: string;
  position: LaligaPosition;
  club: string | null;
  asking_price: number | null;
  market_value: number | null;
  seller_name: string | null;
  expires_at: string | null;
  external_player_id: string;
  external_market_id: string;
};

export type LaligaSnapshot = {
  balance: number;
  squadValue: number;
  squad: LaligaSquadItem[];
  market: LaligaMarketItem[];
};

type JsonRecord = Record<string, unknown>;
type ClubLookup = Map<string, string>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function unwrapArray(value: unknown, keys: string[]): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return null;
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }
  return null;
}

function positionFromId(value: unknown): LaligaPosition | null {
  const positionId = asNumber(value);
  if (positionId === 1) return "GK";
  if (positionId === 2) return "DEF";
  if (positionId === 3) return "MID";
  if (positionId === 4) return "FWD";
  return null;
}

function validIsoDate(value: unknown): string | null {
  const text = asString(value);
  if (!text || Number.isNaN(Date.parse(text))) return null;
  return new Date(text).toISOString();
}

export function parseLaligaLeagues(value: unknown): LaligaLeague[] {
  const entries = unwrapArray(value, ["elements", "leagues"]);
  if (!entries) throw new Error("La respuesta de ligas ha cambiado.");

  return entries.map((entry) => {
    if (!isRecord(entry) || !isRecord(entry.team)) {
      throw new Error("La respuesta de una liga no es válida.");
    }

    const id = asString(entry.id);
    const name = asString(entry.name);
    const teamId = asString(entry.team.id);
    if (!id || !name || !teamId) {
      throw new Error("Faltan datos obligatorios de una liga.");
    }

    return {
      id,
      name,
      teamId,
      balance: asNumber(entry.team.money ?? entry.team.teamMoney),
      squadValue: asNumber(entry.team.teamValue),
      squadCount: asNumber(entry.team.playersNumber) ?? 0,
    };
  });
}

export function parseClubLookup(value: unknown): ClubLookup {
  const entries = unwrapArray(value, ["teams"]);
  if (!entries) throw new Error("La respuesta de clubes ha cambiado.");

  const clubs: ClubLookup = new Map();
  for (const entry of entries) {
    if (!isRecord(entry)) throw new Error("La respuesta de un club no es válida.");
    const id = asString(entry.id);
    const name =
      asString(entry.shortName) ??
      asString(entry.name) ??
      asString(entry.mainName);
    if (!id || !name) throw new Error("Faltan datos obligatorios de un club.");
    clubs.set(id, name);
  }
  return clubs;
}

export function parseStarterIds(value: unknown): Set<string> {
  if (!isRecord(value)) throw new Error("La respuesta de alineación ha cambiado.");
  const formation = isRecord(value.formation) ? value.formation : value;
  const starters = new Set<string>();
  const keys = [
    "goalkeeper",
    "defender",
    "midfield",
    "midfielder",
    "striker",
    "forward",
  ];

  for (const key of keys) {
    const entries = formation[key];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!isRecord(entry)) {
        throw new Error("La alineación contiene un jugador no válido.");
      }
      const master = isRecord(entry.playerMaster) ? entry.playerMaster : entry;
      const playerId = asString(master.id ?? entry.playerId);
      if (playerId) starters.add(playerId);
    }
  }

  return starters;
}

function parsePlayer(
  value: unknown,
  clubs: ClubLookup,
  starters: Set<string>,
): LaligaSquadItem {
  if (!isRecord(value) || !isRecord(value.playerMaster)) {
    throw new Error("La plantilla contiene un jugador no válido.");
  }

  const master = value.playerMaster;
  const externalPlayerId = asString(master.id);
  const name = asString(master.nickname) ?? asString(master.name);
  const position = positionFromId(master.positionId);
  const embeddedClub = isRecord(master.team) ? master.team : null;
  const clubId = asString(embeddedClub?.id ?? master.teamId);
  const club =
    asString(embeddedClub?.shortName) ??
    asString(embeddedClub?.name) ??
    (clubId ? clubs.get(clubId) ?? null : null);

  if (!externalPlayerId || !name || !position) {
    throw new Error("Faltan datos obligatorios de un jugador.");
  }

  return {
    name,
    position,
    club,
    current_value: asNumber(master.marketValue),
    external_player_id: externalPlayerId,
    external_player_team_id: asString(value.playerTeamId),
    is_starter: starters.has(externalPlayerId),
  };
}

export function parseLaligaSquad(
  value: unknown,
  clubs: ClubLookup,
  starters: Set<string>,
): LaligaSquadItem[] {
  if (!isRecord(value) || !Array.isArray(value.players)) {
    throw new Error("La respuesta de plantilla ha cambiado.");
  }
  return value.players.map((entry) => parsePlayer(entry, clubs, starters));
}

export function parseLaligaMarket(
  value: unknown,
  clubs: ClubLookup,
): LaligaMarketItem[] {
  const entries = unwrapArray(value, ["elements"]);
  if (!entries) throw new Error("La respuesta de mercado ha cambiado.");

  const market: LaligaMarketItem[] = [];
  for (const entry of entries) {
    if (!isRecord(entry)) throw new Error("El mercado contiene una fila no válida.");
    if (entry.discr && entry.discr !== "marketPlayerLeague") continue;
    if (!isRecord(entry.playerMaster)) {
      throw new Error("El mercado contiene un jugador no válido.");
    }

    const master = entry.playerMaster;
    const externalPlayerId = asString(master.id);
    const externalMarketId = asString(entry.id);
    const name = asString(master.nickname) ?? asString(master.name);
    const position = positionFromId(master.positionId);
    const embeddedClub = isRecord(master.team) ? master.team : null;
    const clubId = asString(embeddedClub?.id ?? master.teamId);
    const club =
      asString(embeddedClub?.shortName) ??
      asString(embeddedClub?.name) ??
      (clubId ? clubs.get(clubId) ?? null : null);
    const manager = isRecord(entry.manager)
      ? entry.manager
      : isRecord(entry.seller)
        ? entry.seller
        : null;

    if (!externalPlayerId || !externalMarketId || !name || !position) {
      throw new Error("Faltan datos obligatorios de una entrada de mercado.");
    }

    market.push({
      name,
      position,
      club,
      asking_price: asNumber(entry.salePrice),
      market_value: asNumber(master.marketValue),
      seller_name:
        asString(manager?.managerName) ??
        asString(manager?.name) ??
        null,
      expires_at: validIsoDate(entry.expirationDate),
      external_player_id: externalPlayerId,
      external_market_id: externalMarketId,
    });
  }

  return market;
}

export function parseTeamMoney(value: unknown): number | null {
  if (!isRecord(value)) return null;
  return asNumber(value.teamMoney ?? value.money);
}

export function parseTeamValue(value: unknown): number | null {
  if (!isRecord(value)) return null;
  return asNumber(value.teamValue);
}

export function buildLaligaSnapshot(input: {
  team: unknown;
  money: unknown;
  lineup: unknown;
  market: unknown;
  clubs: unknown;
  league: LaligaLeague;
}): LaligaSnapshot {
  const clubs = parseClubLookup(input.clubs);
  const starters = parseStarterIds(input.lineup);
  const squad = parseLaligaSquad(input.team, clubs, starters);
  const market = parseLaligaMarket(input.market, clubs);

  return {
    balance:
      parseTeamMoney(input.money) ??
      input.league.balance ??
      0,
    squadValue:
      parseTeamValue(input.team) ??
      input.league.squadValue ??
      squad.reduce((sum, player) => sum + (player.current_value ?? 0), 0),
    squad,
    market,
  };
}
