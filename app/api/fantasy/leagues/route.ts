import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getMyLeagues } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";

/** GET /api/fantasy/leagues — las ligas del manager conectado. */
export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  try {
    return privateJson({ leagues: await getMyLeagues(auth.token) });
  } catch (error) {
    return errorJson(error);
  }
}
