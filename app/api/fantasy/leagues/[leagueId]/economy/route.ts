import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { buildEconomyReport } from "@/src/server/laliga/economy/sync";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/leagues/{leagueId}/economy
 *
 * Ledger por manager: solo LEE lo ya persistido y lo cruza con el saldo oficial
 * en vivo. Para detectar operaciones nuevas hay que llamar antes a
 * `POST .../economy/sync`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    return privateJson(await buildEconomyReport(auth.token, leagueId));
  } catch (error) {
    return errorJson(error);
  }
}
