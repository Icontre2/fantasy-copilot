import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getLeagueSnapshot } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/leagues/{leagueId}/teams
 *
 * Clasificacion + plantilla de cada participante, con clausulas y caja. Es la
 * lectura base de la pantalla Liga.
 */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    const { standing, teams, failedTeamIds } = await getLeagueSnapshot(auth.token, leagueId);
    return privateJson({ standing, teams, failedTeamIds });
  } catch (error) {
    return errorJson(error);
  }
}
