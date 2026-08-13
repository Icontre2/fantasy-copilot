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

const LEAGUE_COLUMNS: CsvColumn<LeagueSquadRow>[] = [
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
  { header: 'is_shielded', value: ({ player }) => player.isShielded },
  { header: 'fantasy_points', value: ({ player }) => player.points },
  { header: 'average_points', value: ({ player }) => player.averagePoints },
  { header: 'last_season_points', value: ({ player }) => player.lastSeasonPoints },
  { header: 'player_status', value: ({ player }) => player.status },
];

/** Un CSV con todos los jugadores de todos los participantes: una fila por jugador. */
export function buildLeagueCsv(teams: LeagueTeam[]): string {
  const rows = teams.flatMap((team) => team.players.map((player) => ({ team, player })));
  return toCsv(rows, LEAGUE_COLUMNS);
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
