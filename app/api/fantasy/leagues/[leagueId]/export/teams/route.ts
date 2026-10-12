import { csvResponse, errorJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { exportFilename } from "@/src/server/laliga/exports/csv";
import { buildLeagueCsv, getLockedPlayersSummary } from "@/src/server/laliga/exports/league-export";
import { getLeagueSnapshot } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/leagues/{leagueId}/export/teams
 * Descarga `equipos_liga_<leagueId>_<fecha>.csv`: una fila por jugador de la liga.
 */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    const { teams } = await getLeagueSnapshot(auth.token, leagueId);
    const exportedAt = new Date();
    const lockedPlayers = getLockedPlayersSummary(teams, exportedAt);

    console.info(
      `[fantasy-export] ${lockedPlayers.length} jugadores con cláusula bloqueada en la liga ${leagueId}`,
      lockedPlayers.map((player) => ({
        jugador: player.playerName,
        manager: player.managerName,
        clausula: player.clause ?? null,
        desbloqueo: player.unlockDate,
        dias: player.daysToUnlock,
      })),
    );

    return csvResponse(
      buildLeagueCsv(teams, exportedAt),
      exportFilename("equipos_liga", leagueId, exportedAt),
    );
  } catch (error) {
    return errorJson(error);
  }
}
