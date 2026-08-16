import type { LeagueTeam, Position, SquadPlayer } from '@/src/domain/fantasy';
import { getProbableTeam } from '@/src/server/futbolfantasy/lineups';
import { matchExternalPlayer } from '@/src/server/futbolfantasy/match';
import { buildEconomy, SALDO_INICIAL } from './economy/activity';
import { getCurrentWeekPublic, getLeagueActivity, getLeagueSnapshot, getMyLeagues, getPlayerCatalog } from './read';

type PlayerWithProbability = SquadPlayer & {
  lineupProbability?: number;
  lineupExpectedStarter?: boolean;
};

const FORMATIONS: Record<Position, number>[] = [
  { POR: 1, DEF: 3, MED: 4, DEL: 3 },
  { POR: 1, DEF: 4, MED: 3, DEL: 3 },
  { POR: 1, DEF: 4, MED: 4, DEL: 2 },
  { POR: 1, DEF: 5, MED: 3, DEL: 2 },
  { POR: 1, DEF: 5, MED: 4, DEL: 1 },
];

/** Orden interno: un titular publicado sin porcentaje cuenta como señal fuerte, no como un porcentaje fingido. */
function lineupRank(player: PlayerWithProbability): number {
  return player.lineupProbability ?? (player.lineupExpectedStarter ? 100 : -1);
}

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
        .sort((a, b) => lineupRank(b) - lineupRank(a) || b.averagePoints - a.averagePoints)
        .slice(0, formation[position]),
    );
    if (starters.length !== 11) continue;
    const score = starters.reduce((sum, player) => sum + Math.max(lineupRank(player), 0), 0);
    const label = `1-${formation.DEF}-${formation.MED}-${formation.DEL}`;
    if (!best || score > best.score) best = { score, formation: label, starters };
  }
  const starters = best?.starters ?? players.slice().sort((a, b) => lineupRank(b) - lineupRank(a)).slice(0, 11);
  const ids = new Set(starters.map((player) => player.id));
  return {
    formation: best?.formation ?? 'Once probable',
    starters,
    bench: players.filter((player) => !ids.has(player.id)),
  };
}

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
   * De que equipo real es cada jugador de mi plantilla.
   *
   * La probabilidad de titularidad se busca POR EQUIPO: primero se descarga la
   * alineacion probable de cada club y luego se cruza. Si un jugador se queda
   * sin `teamId`, no hay equipo que mirar y pierde el porcentaje — y como el
   * fallo es el mismo para los veinticuatro, la pantalla entera se queda sin
   * porcentajes, que es justo lo que se estaba viendo.
   *
   * El catalogo si trae el equipo de cada jugador, asi que sirve de respaldo
   * cuando la plantilla no lo trae. No es un dato inventado: es el mismo dato,
   * leido de la otra fuente de LALIGA.
   *
   * Aqui hubo una advertencia de que ese catalogo iba una temporada por detras.
   * Ya no aplica: se lee del host de la temporada en curso. Ver `read.ts`.
   */
  const teamIdFromCatalog = new Map(catalog.flatMap((player) => player.teamId ? [[player.id, player.teamId] as const] : []));
  const teamIdOf = (player: { id: string; teamId?: string }) => player.teamId ?? teamIdFromCatalog.get(player.id);

  const teamIds = [...new Set(myTeam.players.flatMap((player) => { const id = teamIdOf(player); return id ? [id] : []; }))];
  const probable = await mapConcurrent(teamIds, 5, async (teamId) => {
    try { return await getProbableTeam(teamId, catalog); } catch { return null; }
  });
  const probableByTeam = new Map(probable.flatMap((team) => team ? [[team.teamId, team] as const] : []));
  const players: PlayerWithProbability[] = myTeam.players.map((player) => {
    const teamId = teamIdOf(player);
    const team = teamId ? probableByTeam.get(teamId) : undefined;
    const signal = team?.players.find((entry) => entry.playerId === player.id) ??
      (team ? matchExternalPlayer(team.players, player.name) : undefined);
    return {
      ...player,
      lineupProbability: signal?.probability,
      lineupExpectedStarter: signal?.expectedStarter,
    };
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
