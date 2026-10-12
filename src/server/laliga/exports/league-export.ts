import type { LeagueTeam, MarketEntry } from '@/src/domain/fantasy';
import { toCsv, type CsvColumn } from './csv';

/**
 * Exportaciones CSV de la liga.
 *
 * ── Columnas pedidas que NO existen en la API ────────────────────────────────
 * Estas se han pedido y **no se emiten**, porque LALIGA no las publica en
 * ningun endpoint verificado (ver `docs/AUDITORIA_FASE_1.md`):
 *
 *   - `acquisition_price` (precio al que el manager compro al jugador)
 *   - `acquisition_date`  (cuando lo compro)
 *   - `current_bid` / `bidder` (puja actual y quien puja) en el mercado
 *
 * Se omiten en vez de emitirse vacias a proposito: una columna que siempre
 * llega en blanco invita a pensar que "a veces si viene", y alguien acabaria
 * construyendo un analisis sobre un dato que no existe. Lo que si existe y se
 * puede aproximar (el precio de compra inferido por variacion de caja) vive en
 * el ledger de `economy/`, donde va etiquetado como calculo y no como dato
 * oficial de LALIGA.
 */

export type LeagueSquadRow = {
  team: LeagueTeam;
  player: LeagueTeam['players'][number];
};

export type LockedPlayerSummary = {
  playerName: string;
  managerName: string;
  clause: number | undefined;
  unlockDate: string;
  daysToUnlock: number;
};

function unlockTimestamp(player: LeagueSquadRow['player']): number | null {
  if (!player.shieldedUntil) return null;
  const timestamp = new Date(player.shieldedUntil).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

/** Fecha legible en la zona horaria de Madrid, sin depender de la zona del servidor. */
function madridDateTime(timestamp: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}`;
}

function clauseStatus(player: LeagueSquadRow['player'], nowMs: number) {
  const unlockMs = unlockTimestamp(player);
  const locked = unlockMs !== null && unlockMs > nowMs;
  return {
    locked,
    unlockDate: locked && unlockMs !== null ? madridDateTime(unlockMs) : '',
    daysToUnlock: locked && unlockMs !== null
      ? Math.round(((unlockMs - nowMs) / 86_400_000) * 100) / 100
      : 0,
  };
}

function leagueColumns(exportNowMs: number): CsvColumn<LeagueSquadRow>[] { return [
  { header: 'manager_id', value: ({ team }) => team.manager.id },
  { header: 'manager_name', value: ({ team }) => team.manager.name },
  { header: 'team_id', value: ({ team }) => team.teamId },
  { header: 'team_money', value: ({ team }) => team.teamMoney },
  { header: 'player_id', value: ({ player }) => player.id },
  { header: 'player_name', value: ({ player }) => player.name },
  { header: 'real_team', value: ({ player }) => player.team },
  { header: 'position', value: ({ player }) => player.position },
  { header: 'market_value', value: ({ player }) => player.marketValue },
  // Vacio cuando LALIGA no publica la clausula de ese jugador.
  { header: 'clause', value: ({ player }) => player.buyoutClause },
  { header: 'clause_locked', value: ({ player }) => clauseStatus(player, exportNowMs).locked },
  { header: 'clause_unlock_date', value: ({ player }) => clauseStatus(player, exportNowMs).unlockDate },
  { header: 'days_to_unlock', value: ({ player }) => clauseStatus(player, exportNowMs).daysToUnlock },
  // Alias compatible: refleja el bloqueo calculado a partir de la fecha oficial.
  { header: 'is_shielded', value: ({ player }) => clauseStatus(player, exportNowMs).locked },
  { header: 'fantasy_points', value: ({ player }) => player.points },
  { header: 'average_points', value: ({ player }) => player.averagePoints },
  { header: 'last_season_points', value: ({ player }) => player.lastSeasonPoints },
  { header: 'player_status', value: ({ player }) => player.status },
]; }

/** Devuelve los jugadores bloqueados, ordenados por tiempo restante. */
export function getLockedPlayersSummary(teams: LeagueTeam[], now = new Date()): LockedPlayerSummary[] {
  const nowMs = now.getTime();
  return teams.flatMap((team) => team.players.flatMap((player) => {
    const status = clauseStatus(player, nowMs);
    if (!status.locked) return [];
    return [{
      playerName: player.name,
      managerName: team.manager.name,
      clause: player.buyoutClause,
      unlockDate: status.unlockDate,
      daysToUnlock: status.daysToUnlock,
    }];
  })).sort((a, b) => a.daysToUnlock - b.daysToUnlock);
}

/** Un CSV con todos los jugadores de todos los participantes: una fila por jugador. */
export function buildLeagueCsv(teams: LeagueTeam[], now = new Date()): string {
  const rows = teams.flatMap((team) => team.players.map((player) => ({ team, player })));
  return toCsv(rows, leagueColumns(now.getTime()));
}

export type MarketRow = {
  entry: MarketEntry;
  /**
   * Variacion media diaria de valor en euros, calculada por esta app sobre el
   * historico publico de cotizacion. `null` si no hay historico suficiente.
   */
  dailyTrend: number | null;
};

const MARKET_COLUMNS: CsvColumn<MarketRow>[] = [
  { header: 'market_id', value: ({ entry }) => entry.marketId },
  { header: 'player_id', value: ({ entry }) => entry.player.id },
  { header: 'player_name', value: ({ entry }) => entry.player.name },
  { header: 'real_team', value: ({ entry }) => entry.player.team },
  { header: 'position', value: ({ entry }) => entry.player.position },
  { header: 'market_value', value: ({ entry }) => entry.player.marketValue },
  { header: 'market_entry_price', value: ({ entry }) => entry.salePrice },
  /**
   * Lo unico que LALIGA publica sobre quien vende es un discriminador de tipo
   * de entrada, no la identidad del manager vendedor. Se emite tal cual, con
   * nombre honesto (`seller_kind`, no `seller`), para no dar a entender que la
   * columna trae un manager.
   */
  { header: 'seller_kind', value: ({ entry }) => entry.sellerKind },
  { header: 'number_of_bids', value: ({ entry }) => entry.numberOfBids },
  /** Solo la puja PROPIA. Las ajenas no son observables ni en vivo. */
  { header: 'my_bid', value: ({ entry }) => entry.myBid?.amount },
  { header: 'expires_at', value: ({ entry }) => entry.expiresAt },
  { header: 'daily_trend_eur', value: ({ dailyTrend }) => dailyTrend },
  { header: 'player_status', value: ({ entry }) => entry.player.status },
  { header: 'fantasy_points', value: ({ entry }) => entry.player.points },
];

/** CSV de los jugadores actualmente a la venta en el mercado de la liga. */
export function buildMarketCsv(rows: MarketRow[]): string {
  return toCsv(rows, MARKET_COLUMNS);
}
