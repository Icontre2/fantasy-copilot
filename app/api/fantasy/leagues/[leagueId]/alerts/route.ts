import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { buildClauseAlertsReport } from "@/src/server/laliga/alerts/build";

export const dynamic = "force-dynamic";

/** GET /api/fantasy/leagues/{leagueId}/alerts — alertas de clausula de toda la liga. */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    return privateJson(await buildClauseAlertsReport(auth.token, leagueId));
  } catch (error) {
    return errorJson(error);
  }
}
