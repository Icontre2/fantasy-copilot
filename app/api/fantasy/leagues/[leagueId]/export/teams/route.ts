import { csvResponse, errorJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { exportFilename } from "@/src/server/laliga/exports/csv";
import { buildLeagueCsv } from "@/src/server/laliga/exports/league-export";
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
    return csvResponse(buildLeagueCsv(teams), exportFilename("equipos_liga", leagueId));
  } catch (error) {
    return errorJson(error);
  }
}
