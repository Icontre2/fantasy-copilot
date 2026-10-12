import type { LeagueTeam } from '@/src/domain/fantasy';
import { supabaseAdmin } from '@/src/server/storage/supabase-admin';

export type ClauseChange = {
  playerId: string;
  playerName: string;
  managerName: string;
  previousManagerName: string | null;
  previousClause: number | null;
  currentClause: number | null;
  changeAmount: number | null;
  eventType: 'INCREASE' | 'DECREASE' | 'ADDED' | 'REMOVED';
  marketValue: number;
  previousSnapshotAt: string;
  currentSnapshotAt: string;
};

type PreviousSnapshot = {
  player_id: string;
  player_name: string;
  manager_id: string;
  manager_name: string;
  buyout_clause: number | null;
  captured_at: string;
};

function nullableSafeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/**
 * Persiste una foto completa y compara cada cláusula con la última foto válida.
 * Solo se llama cuando se ha podido leer la plantilla de todos los managers.
 */
export async function captureClauseSnapshot(
  sessionId: string,
  leagueId: string,
  teams: LeagueTeam[],
  capturedAt = new Date().toISOString(),
): Promise<{ capturedAt: string; playersCaptured: number; changes: ClauseChange[] }> {
  const db = supabaseAdmin();
  const { data: previousRows, error: previousError } = await db
    .from('fantasy_clause_snapshots')
    .select('player_id, player_name, manager_id, manager_name, buyout_clause, captured_at')
    .eq('session_id', sessionId)
    .eq('league_id', leagueId)
    .lt('captured_at', capturedAt)
    .order('captured_at', { ascending: false })
    .limit(10000);

  if (previousError) throw new Error(`No se pudo leer el histórico de cláusulas: ${previousError.message}`);

  const previousByPlayer = new Map<string, PreviousSnapshot>();
  for (const row of (previousRows ?? []) as PreviousSnapshot[]) {
    if (!previousByPlayer.has(row.player_id)) previousByPlayer.set(row.player_id, row);
  }

  const players = teams.flatMap((team) => team.players.map((player) => ({
    session_id: sessionId,
    league_id: leagueId,
    team_id: team.teamId,
    manager_id: team.manager.id,
    manager_name: team.manager.name,
    player_id: player.id,
    player_name: player.name,
    market_value: nullableSafeInteger(player.marketValue),
    buyout_clause: nullableSafeInteger(player.buyoutClause),
    shielded_until: player.shieldedUntil ?? null,
    captured_at: capturedAt,
  })));

  if (players.length === 0) throw new Error('La captura no contiene jugadores; no se guarda una foto vacía.');

  const changes: Array<Record<string, unknown>> = [];
  for (const current of players) {
    const previous = previousByPlayer.get(current.player_id);
    if (!previous) continue;
    const before = nullableSafeInteger(previous.buyout_clause);
    const after = nullableSafeInteger(current.buyout_clause);
    if (before === after) continue;

    const eventType = before === null ? 'ADDED' : after === null ? 'REMOVED' : after > before ? 'INCREASE' : 'DECREASE';
    changes.push({
      session_id: sessionId,
      league_id: leagueId,
      player_id: current.player_id,
      player_name: current.player_name,
      previous_manager_id: previous.manager_id,
      previous_manager_name: previous.manager_name,
      current_manager_id: current.manager_id,
      current_manager_name: current.manager_name,
      previous_clause: before,
      current_clause: after,
      change_amount: before === null || after === null ? null : after - before,
      event_type: eventType,
      market_value: current.market_value,
      previous_snapshot_at: previous.captured_at,
      current_snapshot_at: capturedAt,
    });
  }

  // El índice compuesto hace idempotente un reintento de la misma captura.
  const { error: snapshotError } = await db
    .from('fantasy_clause_snapshots')
    .upsert(players, { onConflict: 'session_id,league_id,player_id,captured_at' });
  if (snapshotError) throw new Error(`No se pudo guardar la captura de cláusulas: ${snapshotError.message}`);

  if (changes.length > 0) {
    const { error: changesError } = await db
      .from('fantasy_clause_changes')
      .upsert(changes, { onConflict: 'session_id,league_id,player_id,previous_snapshot_at,current_snapshot_at' });
    if (changesError) throw new Error(`No se pudieron guardar los cambios de cláusula: ${changesError.message}`);
  }

  // Los eventos se conservan; las fotos diarias antiguas no necesitan crecer para siempre.
  await db.from('fantasy_clause_snapshots').delete()
    .eq('session_id', sessionId)
    .eq('league_id', leagueId)
    .lt('captured_at', new Date(Date.now() - 365 * 86_400_000).toISOString());

  const mappedChanges: ClauseChange[] = changes.map((row) => ({
    playerId: String(row.player_id),
    playerName: String(row.player_name),
    managerName: String(row.current_manager_name),
    previousManagerName: row.previous_manager_name == null ? null : String(row.previous_manager_name),
    previousClause: row.previous_clause == null ? null : Number(row.previous_clause),
    currentClause: row.current_clause == null ? null : Number(row.current_clause),
    changeAmount: row.change_amount == null ? null : Number(row.change_amount),
    eventType: row.event_type as ClauseChange['eventType'],
    marketValue: Number(row.market_value ?? 0),
    previousSnapshotAt: String(row.previous_snapshot_at),
    currentSnapshotAt: String(row.current_snapshot_at),
  }));

  return { capturedAt, playersCaptured: players.length, changes: mappedChanges };
}

export async function readClauseChanges(sessionId: string, leagueId: string, limit = 100): Promise<ClauseChange[]> {
  const { data, error } = await supabaseAdmin()
    .from('fantasy_clause_changes')
    .select('player_id, player_name, previous_manager_name, current_manager_name, previous_clause, current_clause, change_amount, event_type, market_value, previous_snapshot_at, current_snapshot_at')
    .eq('session_id', sessionId)
    .eq('league_id', leagueId)
    .order('current_snapshot_at', { ascending: false })
    .limit(Math.max(1, Math.min(250, Math.floor(limit))));

  if (error) throw new Error(`No se pudo leer el histórico de cambios: ${error.message}`);
  return (data ?? []).map((row) => ({
    playerId: row.player_id,
    playerName: row.player_name,
    managerName: row.current_manager_name,
    previousManagerName: row.previous_manager_name,
    previousClause: row.previous_clause == null ? null : Number(row.previous_clause),
    currentClause: row.current_clause == null ? null : Number(row.current_clause),
    changeAmount: row.change_amount == null ? null : Number(row.change_amount),
    eventType: row.event_type as ClauseChange['eventType'],
    marketValue: Number(row.market_value ?? 0),
    previousSnapshotAt: row.previous_snapshot_at,
    currentSnapshotAt: row.current_snapshot_at,
  }));
}
