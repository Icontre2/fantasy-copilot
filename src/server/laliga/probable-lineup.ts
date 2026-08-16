import type { LeagueTeam, SquadPlayer } from '@/src/domain/fantasy';
import { getProbableTeam } from '@/src/server/futbolfantasy/lineups';
import { matchExternalPlayer } from '@/src/server/futbolfantasy/match';
import { bestEleven } from './lineup.ts';
import { getLeagueSnapshot, getPlayerCatalog } from './read';

export type PlayerWithProbability = SquadPlayer & {
  lineupProbability?: number;
  lineupExpectedStarter?: boolean;
};

/** Tareas en paralelo con un tope, para no abrir veinte descargas a la vez. */
async function mapConcurrent<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        const item = items[index];
        if (item !== undefined) output[index] = await worker(item);
      }
    }),
  );
  return output;
}

/**
 * Cuelga a cada jugador de una plantilla su probabilidad de ser titular.
 *
 * Se busca POR CLUB: primero la alineacion probable de cada equipo real, y
 * luego se cruza. El cruce va primero por id y solo despues por nombre, porque
 * el nombre es la via fragil (FutbolFantasy abrevia: "I. Williams").
 *
 * Un club que falle no tumba al resto: sus jugadores se quedan sin porcentaje,
 * que la interfaz pinta como `?`.
 */
export async function conProbabilidades(
  players: SquadPlayer[],
  catalog: Awaited<ReturnType<typeof getPlayerCatalog>>,
): Promise<PlayerWithProbability[]> {
  const teamIdFromCatalog = new Map(
    catalog.flatMap((player) => (player.teamId ? [[player.id, player.teamId] as const] : [])),
  );
  const teamIdOf = (player: { id: string; teamId?: string }) =>
    player.teamId ?? teamIdFromCatalog.get(player.id);

  const teamIds = [...new Set(players.flatMap((player) => {
    const id = teamIdOf(player);
    return id ? [id] : [];
  }))];

  const probable = await mapConcurrent(teamIds, 5, async (teamId) => {
    try {
      return await getProbableTeam(teamId, catalog);
    } catch {
      return null;
    }
  });
  const probableByTeam = new Map(probable.flatMap((team) => (team ? [[team.teamId, team] as const] : [])));

  return players.map((player) => {
    const teamId = teamIdOf(player);
    const team = teamId ? probableByTeam.get(teamId) : undefined;
    const signal =
      team?.players.find((entry) => entry.playerId === player.id) ??
      (team ? matchExternalPlayer(team.players, player.name) : undefined);
    return {
      ...player,
      lineupProbability: signal?.probability,
      lineupExpectedStarter: signal?.expectedStarter,
    };
  });
}

/**
 * Once probable de UN participante de la liga, el que sea.
 *
 * Se calcula a peticion y no para los ocho a la vez: cada manager mueve unos
 * doce clubes distintos, y hacerlos todos de golpe al abrir la pantalla Liga
 * significaria descargar las veinte alineaciones antes de enseñar nada. Asi solo
 * se paga por el manager que abres, y lo ya descargado se comparte.
 */
export async function buildTeamLineup(accessToken: string, leagueId: string, teamId: string) {
  const [snapshot, catalog] = await Promise.all([
    getLeagueSnapshot(accessToken, leagueId),
    getPlayerCatalog(),
  ]);

  const team: LeagueTeam | undefined = snapshot.teams.find((entry) => entry.teamId === teamId);
  if (!team) return null;

  const players = await conProbabilidades(team.players, catalog);
  return {
    teamId: team.teamId,
    manager: team.manager,
    teamValue: team.teamValue,
    lineup: bestEleven(players),
  };
}
