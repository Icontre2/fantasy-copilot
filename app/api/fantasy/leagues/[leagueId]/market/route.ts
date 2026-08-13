import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getLeagueMarket } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";

/** GET /api/fantasy/leagues/{leagueId}/market — jugadores a la venta ahora mismo. */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    return privateJson({ market: await getLeagueMarket(auth.token, leagueId) });
  } catch (error) {
    return errorJson(error);
  }
}
