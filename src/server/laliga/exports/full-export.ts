import type { LeagueTeam, MarketEntry, Player, SquadPlayer, StandingRow } from '@/src/domain/fantasy';
import { toCsv, type CsvColumn } from './csv.ts';
import { clauseStatus } from './league-export.ts';

/**
 * Exportación completa: TODO el juego en un solo CSV.
 *
 * Una fila por jugador de LALIGA Fantasy —los de tu liga, los del mercado y los
 * libres—, con todo lo que el juego publica de él y lo que pasa con él en tu
 * liga. Así se puede filtrar en una hoja de cálculo sin cruzar varios ficheros.
 *
 * Mismas reglas que el resto de exportaciones (ver `csv.ts` y
 * `league-export.ts`): un dato que LALIGA no publica sale como celda vacía,
 * nunca como cero, y las columnas que son cálculo nuestro llevan `calc_` delante
 * para que nadie las confunda con un dato oficial.
 */

export type Situacion = 'owned' | 'owned_on_market' | 'market' | 'free';

export type FullExportRow = {
  player: Player;
  situation: Situacion;
  team?: LeagueTeam;
  owned?: SquadPlayer;
  standing?: StandingRow;
  market?: MarketEntry;
  /** Variación media diaria de valor (€), sobre el histórico público. Solo mercado. */
  dailyTrend?: number | null;
};

export type FullExportInput = {
  catalog: Player[];
  teams: LeagueTeam[];
  standing: StandingRow[];
  market: MarketEntry[];
  /** Por id de jugador. */
  trends?: Map<string, number | null>;
};

const ORDEN_SITUACION: Record<Situacion, number> = { owned_on_market: 0, market: 1, owned: 2, free: 3 };

/**
 * Cruza catálogo, plantillas y mercado. El catálogo manda en los datos del
 * jugador (es el más completo: puntos por jornada, puntos del año pasado); un
 * jugador de tu liga o del mercado que no esté en el catálogo entra igual, con lo
 * que traiga su propia fuente.
 */
export function buildFullExportRows(input: FullExportInput): FullExportRow[] {
  const propietarios = new Map<string, { team: LeagueTeam; owned: SquadPlayer }>();
  for (const team of input.teams) {
    for (const owned of team.players) propietarios.set(owned.id, { team, owned });
  }
  const enMercado = new Map(input.market.map((entry) => [entry.player.id, entry]));
  const clasificacion = new Map(input.standing.map((row) => [row.teamId, row]));

  const jugadores = new Map<string, Player>();
  for (const player of input.catalog) jugadores.set(player.id, player);
  for (const { owned } of propietarios.values()) if (!jugadores.has(owned.id)) jugadores.set(owned.id, owned);
  for (const entry of input.market) if (!jugadores.has(entry.player.id)) jugadores.set(entry.player.id, entry.player);

  return [...jugadores.values()]
    .map((player) => {
      const propiedad = propietarios.get(player.id);
      const market = enMercado.get(player.id);
      const situation: Situacion = propiedad ? (market ? 'owned_on_market' : 'owned') : market ? 'market' : 'free';
      return {
        player,
        situation,
        team: propiedad?.team,
        owned: propiedad?.owned,
        standing: propiedad ? clasificacion.get(propiedad.team.teamId) : undefined,
        market,
        dailyTrend: market ? (input.trends?.get(player.id) ?? null) : undefined,
      };
    })
    .sort(
      (a, b) =>
        ORDEN_SITUACION[a.situation] - ORDEN_SITUACION[b.situation] ||
        (a.team?.manager.name ?? '').localeCompare(b.team?.manager.name ?? '') ||
        b.player.marketValue - a.player.marketValue,
    );
}

/** Última jornada con puntos publicados en cualquier jugador. */
function ultimaJornada(rows: FullExportRow[]): number {
  let maxima = 0;
  for (const { player } of rows) {
    for (const entrada of player.weekPoints ?? []) maxima = Math.max(maxima, entrada.jornada);
  }
  return maxima;
}

function porMillon(points: number, value: number): number | null {
  return value > 0 ? Math.round((points / (value / 1_000_000)) * 100) / 100 : null;
}

function columnas(rows: FullExportRow[], nowMs: number): CsvColumn<FullExportRow>[] {
  const jornadas = Array.from({ length: ultimaJornada(rows) }, (_, i) => i + 1);
  return [
    { header: 'situation', value: (r) => r.situation },
    // Jugador (dato oficial).
    { header: 'player_id', value: (r) => r.player.id },
    { header: 'player_name', value: (r) => r.player.name },
    { header: 'real_team', value: (r) => r.player.team },
    { header: 'real_team_id', value: (r) => r.player.teamId },
    { header: 'position', value: (r) => r.player.position },
    { header: 'player_status', value: (r) => r.player.status },
    { header: 'market_value', value: (r) => r.player.marketValue },
    { header: 'fantasy_points', value: (r) => r.player.points },
    { header: 'average_points', value: (r) => r.player.averagePoints },
    { header: 'last_season_points', value: (r) => r.player.lastSeasonPoints },
    { header: 'weeks_played', value: (r) => r.player.weekPoints?.length },
    { header: 'calc_points_per_million', value: (r) => porMillon(r.player.points, r.player.marketValue) },
    // Su dueño en tu liga.
    { header: 'manager_id', value: (r) => r.team?.manager.id },
    { header: 'manager_name', value: (r) => r.team?.manager.name },
    { header: 'team_id', value: (r) => r.team?.teamId },
    { header: 'manager_rank', value: (r) => r.standing?.position },
    { header: 'manager_points', value: (r) => r.standing?.points },
    { header: 'manager_team_value', value: (r) => r.standing?.teamValue ?? r.team?.teamValue },
    { header: 'manager_team_money', value: (r) => r.team?.teamMoney },
    { header: 'clause', value: (r) => r.owned?.buyoutClause },
    { header: 'clause_locked', value: (r) => (r.owned ? String(clauseStatus(r.owned, nowMs).locked) : undefined) },
    { header: 'clause_unlock_date', value: (r) => (r.owned ? clauseStatus(r.owned, nowMs).unlockDate || undefined : undefined) },
    { header: 'days_to_unlock', value: (r) => (r.owned && clauseStatus(r.owned, nowMs).locked ? clauseStatus(r.owned, nowMs).daysToUnlock : undefined) },
    // En el mercado de tu liga.
    { header: 'market_id', value: (r) => r.market?.marketId },
    { header: 'market_sale_price', value: (r) => r.market?.salePrice },
    { header: 'calc_sale_vs_value_pct', value: (r) => (r.market && r.player.marketValue > 0 ? Math.round((r.market.salePrice / r.player.marketValue - 1) * 1000) / 10 : undefined) },
    { header: 'market_seller_kind', value: (r) => r.market?.sellerKind },
    { header: 'market_number_of_bids', value: (r) => r.market?.numberOfBids },
    { header: 'market_my_bid', value: (r) => r.market?.myBid?.amount },
    { header: 'market_expires_at', value: (r) => r.market?.expiresAt },
    { header: 'calc_daily_trend_eur', value: (r) => r.dailyTrend },
    // Puntos por jornada (dato oficial). Vacío = sin puntuación publicada, no cero.
    ...jornadas.map((jornada) => ({
      header: `points_w${jornada}`,
      value: (r: FullExportRow) => r.player.weekPoints?.find((entrada) => entrada.jornada === jornada)?.puntos,
    })),
  ];
}

export function buildFullCsv(input: FullExportInput, now = new Date()): string {
  const rows = buildFullExportRows(input);
  return toCsv(rows, columnas(rows, now.getTime()));
}
