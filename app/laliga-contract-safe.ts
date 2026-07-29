import {
  buildLaligaSnapshot as buildBaseSnapshot,
  LaligaContractError,
  unwrapMarketPayload,
} from "./laliga-contract";
import type { LaligaLeague, LaligaSnapshot } from "./laliga-contract";

type JsonRecord = Record<string, unknown>;

const NON_PLAYABLE_POSITION_CODES = new Set(["0", "5"]);
const PLAYABLE_POSITION_CODES = new Set(["1", "2", "3", "4"]);
const PLAYABLE_POSITION_NAMES = new Set([
  "gk",
  "goalkeeper",
  "portero",
  "por",
  "def",
  "defender",
  "defence",
  "defensa",
  "dfc",
  "mid",
  "midfielder",
  "centrocampista",
  "medio",
  "mc",
  "fwd",
  "forward",
  "striker",
  "delantero",
  "dc",
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstDefined(...values: unknown[]): unknown {
  return values.find(
    (value) =>
      value !== null &&
      value !== undefined &&
      !(typeof value === "string" && value.trim() === ""),
  );
}

function playerNode(row: unknown): JsonRecord | null {
  if (!isRecord(row)) return null;
  for (const key of ["playerMaster", "player", "marketPlayer", "playerData", "master"]) {
    if (isRecord(row[key])) return row[key];
  }
  return null;
}

function rawPositionOf(row: unknown): unknown {
  if (!isRecord(row)) return undefined;
  const player = playerNode(row);
  return firstDefined(
    player?.positionId,
    player?.position,
    player?.role,
    row.positionId,
    row.position,
  );
}

function normalizedPositionCode(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function isNonPlayableRow(row: unknown): boolean {
  const code = normalizedPositionCode(rawPositionOf(row));
  return code !== null && NON_PLAYABLE_POSITION_CODES.has(code);
}

function isRecognizedPlayablePosition(value: unknown): boolean {
  const code = normalizedPositionCode(value);
  if (!code) return false;
  if (PLAYABLE_POSITION_CODES.has(code)) return true;
  const normalized = code
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return PLAYABLE_POSITION_NAMES.has(normalized);
}

function firstUnknownPosition(rows: unknown[]): { index: number; value: unknown } | null {
  for (const [index, row] of rows.entries()) {
    const value = rawPositionOf(row);
    if (isNonPlayableRow(row)) continue;
    if (!isRecognizedPlayablePosition(value)) return { index, value };
  }
  return null;
}

function sanitizeTeam(team: unknown): unknown {
  if (!isRecord(team) || !Array.isArray(team.players)) return team;
  return {
    ...team,
    players: team.players.filter((row) => !isNonPlayableRow(row)),
  };
}

function sanitizeMarket(market: unknown): unknown {
  const rows = unwrapMarketPayload(market);
  if (!rows) return market;
  return rows.filter((row) => !isNonPlayableRow(row));
}

export function buildLaligaSnapshot(input: {
  team: unknown;
  money: unknown;
  lineup: unknown;
  market: unknown;
  clubs: unknown;
  league: LaligaLeague;
}): LaligaSnapshot {
  const sanitizedTeam = sanitizeTeam(input.team);
  const sanitizedMarket = sanitizeMarket(input.market);

  try {
    return buildBaseSnapshot({
      ...input,
      team: sanitizedTeam,
      market: sanitizedMarket,
    });
  } catch (error) {
    if (
      error instanceof LaligaContractError &&
      error.message.includes("posición válida")
    ) {
      const squadRows =
        isRecord(sanitizedTeam) && Array.isArray(sanitizedTeam.players)
          ? sanitizedTeam.players
          : [];
      const marketRows = unwrapMarketPayload(sanitizedMarket) ?? [];
      const diagnostic =
        firstUnknownPosition(squadRows) ?? firstUnknownPosition(marketRows);

      if (diagnostic) {
        const raw = diagnostic.value;
        throw new LaligaContractError(
          error.stage,
          `Posición no reconocida (código: ${typeof raw}:${String(raw).slice(0, 12)})`,
          diagnostic.index,
        );
      }
    }
    throw error;
  }
}
