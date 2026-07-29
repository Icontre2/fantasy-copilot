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

export class LaligaContractError extends Error {
  readonly stage: string;
  readonly index: number | null;

  constructor(stage: string, message: string, index: number | null = null) {
    super(index === null ? message : `${message} (fila ${index})`);
    this.name = "LaligaContractError";
    this.stage = stage;
    this.index = index;
  }
}

const MAX_MARKET_ROWS = 500;
const MAX_MONEY = 1_000_000_000_000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

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

function firstDefined(...candidates: unknown[]): unknown {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    if (typeof candidate === "string" && candidate.trim() === "") continue;
    return candidate;
  }
  return undefined;
}

function readPath(source: unknown, path: string): unknown {
  if (!isRecord(source)) return undefined;
  let current: unknown = source;
  for (const segment of path.split(".")) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function toStableId(value: unknown): string | null {
  const normalized = asString(value);
  return normalized && ID_PATTERN.test(normalized) ? normalized : null;
}

function toMoney(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 && value <= MAX_MONEY ? value : null;
  }
  if (typeof value !== "string") return null;

  let text = value.trim().replace(/[€$\s\u00a0]/g, "");
  if (!text) return null;

  const hasDot = text.includes(".");
  const hasComma = text.includes(",");
  if (hasDot && hasComma) {
    text =
      text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (hasComma) {
    text = /,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,/g, "");
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_MONEY ? parsed : null;
}

function toTrimmedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

const POSITION_BY_NAME: Record<string, LaligaPosition> = {
  gk: "GK",
  goalkeeper: "GK",
  portero: "GK",
  por: "GK",
  def: "DEF",
  defender: "DEF",
  defence: "DEF",
  defensa: "DEF",
  dfc: "DEF",
  mid: "MID",
  midfielder: "MID",
  centrocampista: "MID",
  medio: "MID",
  mc: "MID",
  fwd: "FWD",
  forward: "FWD",
  striker: "FWD",
  delantero: "FWD",
  dc: "FWD",
};

function normalizePosition(value: unknown): LaligaPosition | null {
  const numeric = positionFromId(value);
  if (numeric) return numeric;
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  if (upper === "GK" || upper === "DEF" || upper === "MID" || upper === "FWD") {
    return upper;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return POSITION_BY_NAME[normalized] ?? null;
}

function findPlayerNode(entry: JsonRecord): JsonRecord | null {
  for (const key of ["playerMaster", "player", "marketPlayer", "playerData", "master"]) {
    if (isRecord(entry[key])) return entry[key];
  }
  return null;
}

function clubFromMarketEntry(
  entry: JsonRecord,
  player: JsonRecord | null,
  clubs: ClubLookup,
): string | null {
  const embeddedClub = isRecord(player?.team)
    ? player.team
    : isRecord(player?.club)
      ? player.club
      : null;
  const clubId = asString(embeddedClub?.id ?? player?.teamId ?? player?.clubId);
  return (
    toTrimmedString(
      firstDefined(
        embeddedClub?.shortName,
        embeddedClub?.name,
        player?.teamName,
        player?.clubName,
        readPath(entry, "team.shortName"),
        readPath(entry, "team.name"),
        entry.teamName,
      ),
      120,
    ) ?? (clubId ? clubs.get(clubId) ?? null : null)
  );
}

function buildExternalMarketId(entry: JsonRecord, playerId: string): string | null {
  const direct = toStableId(
    firstDefined(entry.id, entry.marketId, entry.offerId, entry.saleId),
  );
  if (direct) return direct;

  const sellerId = toStableId(
    firstDefined(
      readPath(entry, "seller.id"),
      readPath(entry, "manager.id"),
      readPath(entry, "user.id"),
      entry.sellerId,
      entry.managerId,
    ),
  );
  const derived = sellerId ? `m-${playerId}-${sellerId}` : `m-${playerId}`;
  return ID_PATTERN.test(derived) ? derived : null;
}

export function unwrapMarketPayload(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return null;
  const keys = [
    "elements",
    "data",
    "result",
    "items",
    "content",
    "market",
    "offers",
    "records",
    "list",
  ];
  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
    if (isRecord(candidate)) {
      for (const inner of keys) {
        if (Array.isArray(candidate[inner])) return candidate[inner];
      }
    }
  }
  return null;
}

export function parseLaligaMarketEntry(
  raw: unknown,
  index: number,
  clubs: ClubLookup = new Map(),
): LaligaMarketItem {
  if (!isRecord(raw)) {
    throw new LaligaContractError("market", "Entrada de mercado con formato inesperado", index);
  }

  const player = findPlayerNode(raw);
  const externalPlayerId = toStableId(
    firstDefined(
      player?.id,
      player?.playerId,
      player?.playerMasterId,
      raw.playerId,
      raw.playerMasterId,
    ),
  );
  if (!externalPlayerId) {
    throw new LaligaContractError("market", "Falta identificador de jugador", index);
  }

  const name = toTrimmedString(
    firstDefined(
      player?.nickname,
      player?.name,
      player?.fullName,
      player?.displayName,
      raw.nickname,
      raw.name,
      raw.playerName,
    ),
    160,
  );
  if (!name) throw new LaligaContractError("market", "Falta nombre de jugador", index);

  const position = normalizePosition(
    firstDefined(
      player?.positionId,
      player?.position,
      player?.role,
      raw.positionId,
      raw.position,
    ),
  );
  if (!position) {
    throw new LaligaContractError("market", "Falta posición válida", index);
  }

  const externalMarketId = buildExternalMarketId(raw, externalPlayerId);
  if (!externalMarketId) {
    throw new LaligaContractError("market", "Falta identificador de mercado estable", index);
  }

  const manager = isRecord(raw.manager)
    ? raw.manager
    : isRecord(raw.seller)
      ? raw.seller
      : null;

  return {
    name,
    position,
    club: clubFromMarketEntry(raw, player, clubs),
    asking_price:
      toMoney(
        firstDefined(raw.salePrice, raw.askingPrice, raw.price, raw.sale_price, raw.amount),
      ) ?? 0,
    market_value:
      toMoney(
        firstDefined(
          player?.marketValue,
          player?.value,
          raw.marketValue,
          raw.playerMarketValue,
          raw.value,
        ),
      ) ?? 0,
    seller_name:
      toTrimmedString(
        firstDefined(
          manager?.managerName,
          manager?.name,
          readPath(raw, "user.name"),
          readPath(raw, "owner.name"),
          raw.sellerName,
          typeof raw.seller === "string" ? raw.seller : undefined,
          typeof raw.manager === "string" ? raw.manager : undefined,
        ),
        160,
      ) ?? null,
    expires_at: validIsoDate(
      firstDefined(
        raw.expirationDate,
        raw.expiresAt,
        raw.expiration,
        raw.endDate,
        raw.expireDate,
      ),
    ),
    external_player_id: externalPlayerId,
    external_market_id: externalMarketId,
  };
}

export function parseLaligaMarket(
  value: unknown,
  clubs: ClubLookup = new Map(),
): LaligaMarketItem[] {
  const entries = unwrapMarketPayload(value);
  if (!entries) throw new LaligaContractError("market", "La respuesta de mercado ha cambiado.");
  if (entries.length > MAX_MARKET_ROWS) {
    throw new LaligaContractError(
      "market",
      `El mercado excede el máximo admitido de ${MAX_MARKET_ROWS} entradas`,
    );
  }

  const market: LaligaMarketItem[] = [];
  for (const [index, entry] of entries.entries()) {
    if (isRecord(entry) && entry.discr && entry.discr !== "marketPlayerLeague") continue;
    market.push(parseLaligaMarketEntry(entry, index, clubs));
  }

  const seen = new Set<string>();
  for (const entry of market) {
    if (seen.has(entry.external_market_id)) {
      throw new LaligaContractError("market", "Identificador de mercado duplicado");
    }
    seen.add(entry.external_market_id);
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
    balance: parseTeamMoney(input.money) ?? input.league.balance ?? 0,
    squadValue:
      parseTeamValue(input.team) ??
      input.league.squadValue ??
      squad.reduce((sum, player) => sum + (player.current_value ?? 0), 0),
    squad,
    market,
  };
}
