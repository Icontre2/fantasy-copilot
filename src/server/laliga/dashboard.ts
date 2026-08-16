import type { LeagueTeam } from '@/src/domain/fantasy';
import { buildEconomy, SALDO_INICIAL } from './economy/activity';
import { bestEleven } from './lineup.ts';
import { conProbabilidades, type PlayerWithProbability } from './probable-lineup';
import { getCurrentWeekPublic, getLeagueActivity, getLeagueSnapshot, getMyLeagues, getPlayerCatalog } from './read';

export async function buildDashboard(accessToken: string, leagueId: string) {
  const [snapshot, leagues, catalog, activity, semana] = await Promise.all([
    getLeagueSnapshot(accessToken, leagueId),
    getMyLeagues(accessToken),
    getPlayerCatalog(),
    getLeagueActivity(accessToken, leagueId),
    // Para poder decir "puntos de ESTA jornada" hay que saber cual es.
    getCurrentWeekPublic().catch(() => null),
  ]);
  const league = leagues.find((item) => item.id === leagueId);
  const myTeam = snapshot.teams.find((team) => team.teamId === league?.myTeamId);
  if (!myTeam) throw new Error('LALIGA no indicó cuál es tu equipo dentro de esta liga.');

  /*
   * Probabilidad de titularidad de cada jugador de MI plantilla. El mismo
   * calculo que usa la pantalla de un rival: vive en `probable-lineup.ts` para
   * que las dos enseñen exactamente lo mismo y no se separen con el tiempo.
   */
  const players: PlayerWithProbability[] = await conProbabilidades(myTeam.players, catalog);

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

  // Respaldo solo cuando tampoco el endpoint individual publica la caja. No se
  // corrige con el error de otro manager: las recompensas no reclamadas y otros
  // movimientos no publicados son individuales.
  const myEstimate = SALDO_INICIAL + knownFlowOf(myTeam);

  return {
    league: league ?? { id: leagueId, name: 'Mi liga' },
    /** `null` si LALIGA no dice en que jornada vamos: entonces no se rotula. */
    currentWeek: semana?.weekNumber ?? null,
    weekIsLive: semana?.isLive ?? false,
    me: {
      ...myTeam,
      players,
      position: standingByTeam.get(myTeam.teamId)?.position,
      points: standingByTeam.get(myTeam.teamId)?.points ?? myTeam.teamPoints,
      teamMoney: officialCashOf(myTeam),
      cashSource: myTeam.teamMoney === undefined ? 'NO_PUBLICADA' : 'OFICIAL',
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
