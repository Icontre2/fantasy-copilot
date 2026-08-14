import type { LeagueTeam, Position, SquadPlayer } from '@/src/domain/fantasy';
import { getProbableTeam } from '@/src/server/futbolfantasy/lineups';
import { matchExternalPlayer } from '@/src/server/futbolfantasy/match';
import { buildEconomy, SALDO_INICIAL } from './economy/activity';
import { getLeagueActivity, getLeagueSnapshot, getMyLeagues, getPlayerCatalog } from './read';

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
  const [snapshot, leagues, catalog, activity] = await Promise.all([
    getLeagueSnapshot(accessToken, leagueId),
    getMyLeagues(accessToken),
    getPlayerCatalog(),
    getLeagueActivity(accessToken, leagueId),
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
  const economyByManager = new Map(buildEconomy({
    managers: snapshot.teams.map((team) => ({
      managerId: team.manager.id,
      managerName: team.manager.name,
      puntos: standingByTeam.get(team.teamId)?.points ?? team.teamPoints ?? 0,
      cajaOficial: team.teamMoney ?? null,
    })),
    activity,
  }).map((economy) => [economy.managerId, economy]));
  const officialCashOf = (team: LeagueTeam) => team.teamMoney;
  const knownFlowOf = (team: LeagueTeam) => economyByManager.get(team.manager.id)?.flujoConocido ?? 0;

  /*
   * Caja estimada de un rival, y por que lleva un margen de error medido.
   *
   * `100 M + flujo conocido` daria la caja exacta SI la actividad cubriera toda
   * la liga. No la cubre: LALIGA solo publica desde hace unos dias, y lo que se
   * movio antes falta. Enseñar el flujo a secas (siempre negativo, porque en
   * pretemporada todos gastan) no responde a "cuanto dinero tiene", y enseñar la
   * estimacion a secas la haria pasar por exacta.
   *
   * La salida es medir el error con el unico caso comprobable: el propio
   * usuario, de quien SI se conoce la caja oficial. Si a el la estimacion le
   * falla en 31 M, a sus rivales le fallara en un orden parecido — y eso se
   * puede decir en pantalla en vez de callarlo.
   */
  const myOfficialCash = officialCashOf(myTeam);
  const myEstimate = SALDO_INICIAL + knownFlowOf(myTeam);
  const estimationError = myOfficialCash === undefined ? null : myOfficialCash - myEstimate;

  return {
    league: league ?? { id: leagueId, name: 'Mi liga' },
    me: {
      ...myTeam,
      players,
      position: standingByTeam.get(myTeam.teamId)?.position,
      points: standingByTeam.get(myTeam.teamId)?.points ?? myTeam.teamPoints,
      teamMoney: officialCashOf(myTeam),
      cashSource: 'OFICIAL',
      knownCashFlow: knownFlowOf(myTeam),
      estimatedCash: myEstimate,
      netWorth: null,
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
        teamMoney: officialCashOf(team),
        cashSource: team.teamMoney === undefined ? 'NO_PUBLICADA' : 'OFICIAL',
        knownCashFlow: knownFlowOf(team),
        estimatedCash: SALDO_INICIAL + knownFlowOf(team),
        netWorth: null,
      }))
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    failedTeamIds: snapshot.failedTeamIds,
    /**
     * Cuanto se desvia la estimacion en el unico caso comprobable. Negativo =
     * la estimacion se queda ALTA porque faltan compras antiguas.
     */
    estimationError,
    activityFrom: activity.map((entry) => entry.createdAt).sort()[0] ?? null,
  };
}

/**
 * Patrimonio = valor de plantilla + caja. `null` si falta cualquiera de los dos.
 *
 * Comprobado contra una liga real (2026-08-13): **LALIGA solo publica
 * `teamMoney` del manager conectado**. Para los rivales llega `null`, en las 8
 * plantillas de la liga probada.
 *
 * La version anterior hacia `(teamValue ?? 0) + (teamMoney ?? 0)`, asi que para
 * un rival devolvia exactamente el valor de su plantilla y lo etiquetaba
 * "Patrimonio total". No era un redondeo: era afirmar que su caja es cero
 * cuando lo cierto es que no se sabe. Un manager con 30 M en caja aparecia
 * igual que uno arruinado.
 */
