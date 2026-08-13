import type { LeagueTeam, Position, SquadPlayer } from '@/src/domain/fantasy';
import { getProbableTeam } from '@/src/server/futbolfantasy/lineups';
import { matchExternalPlayer } from '@/src/server/futbolfantasy/match';
import { getLeagueSnapshot, getMyLeagues, getPlayerCatalog } from './read';

type PlayerWithProbability = SquadPlayer & { lineupProbability?: number };

const FORMATIONS: Record<Position, number>[] = [
  { POR: 1, DEF: 3, MED: 4, DEL: 3 },
  { POR: 1, DEF: 4, MED: 3, DEL: 3 },
  { POR: 1, DEF: 4, MED: 4, DEL: 2 },
  { POR: 1, DEF: 5, MED: 3, DEL: 2 },
  { POR: 1, DEF: 5, MED: 4, DEL: 1 },
];

async function mapConcurrent<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      if (item !== undefined) output[index] = await worker(item);
    }
  }));
  return output;
}

function bestEleven(players: PlayerWithProbability[]): { formation: string; starters: PlayerWithProbability[]; bench: PlayerWithProbability[] } {
  let best: { score: number; formation: string; starters: PlayerWithProbability[] } | null = null;
  for (const formation of FORMATIONS) {
    const starters = (Object.keys(formation) as Position[]).flatMap((position) =>
      players.filter((player) => player.position === position)
        .sort((a, b) => (b.lineupProbability ?? -1) - (a.lineupProbability ?? -1) || b.averagePoints - a.averagePoints)
        .slice(0, formation[position]),
    );
    if (starters.length !== 11) continue;
    const score = starters.reduce((sum, player) => sum + (player.lineupProbability ?? 0), 0);
    const label = `1-${formation.DEF}-${formation.MED}-${formation.DEL}`;
    if (!best || score > best.score) best = { score, formation: label, starters };
  }
  const starters = best?.starters ?? players.slice().sort((a, b) => (b.lineupProbability ?? -1) - (a.lineupProbability ?? -1)).slice(0, 11);
  const ids = new Set(starters.map((player) => player.id));
  return {
    formation: best?.formation ?? 'Once probable',
    starters,
    bench: players.filter((player) => !ids.has(player.id)),
  };
}

export async function buildDashboard(accessToken: string, leagueId: string) {
  const [snapshot, leagues, catalog] = await Promise.all([
    getLeagueSnapshot(accessToken, leagueId),
    getMyLeagues(accessToken),
    getPlayerCatalog(),
  ]);
  const league = leagues.find((item) => item.id === leagueId);
  const myTeam = snapshot.teams.find((team) => team.teamId === league?.myTeamId);
  if (!myTeam) throw new Error('LALIGA no indicó cuál es tu equipo dentro de esta liga.');

  const teamIds = [...new Set(myTeam.players.flatMap((player) => player.teamId ? [player.teamId] : []))];
  const probable = await mapConcurrent(teamIds, 5, async (teamId) => {
    try { return await getProbableTeam(teamId, catalog); } catch { return null; }
  });
  const probableByTeam = new Map(probable.flatMap((team) => team ? [[team.teamId, team] as const] : []));
  const players: PlayerWithProbability[] = myTeam.players.map((player) => {
    const team = player.teamId ? probableByTeam.get(player.teamId) : undefined;
    const signal = team?.players.find((entry) => entry.playerId === player.id) ??
      (team ? matchExternalPlayer(team.players, player.name) : undefined);
    return { ...player, lineupProbability: signal?.probability };
  });
  const standingByTeam = new Map(snapshot.standing.map((row) => [row.teamId, row]));

  return {
    league: league ?? { id: leagueId, name: 'Mi liga' },
    me: {
      ...myTeam,
      players,
      position: standingByTeam.get(myTeam.teamId)?.position,
      points: standingByTeam.get(myTeam.teamId)?.points ?? myTeam.teamPoints,
      netWorth: (myTeam.teamValue ?? 0) + (myTeam.teamMoney ?? 0),
    },
    lineup: bestEleven(players),
    competitors: snapshot.teams
      .filter((team) => team.teamId !== myTeam.teamId)
      .map((team: LeagueTeam) => ({
        teamId: team.teamId,
        manager: team.manager,
        position: standingByTeam.get(team.teamId)?.position,
        points: standingByTeam.get(team.teamId)?.points ?? team.teamPoints,
        teamValue: team.teamValue,
        teamMoney: team.teamMoney,
        netWorth: (team.teamValue ?? 0) + (team.teamMoney ?? 0),
      }))
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    failedTeamIds: snapshot.failedTeamIds,
  };
}
