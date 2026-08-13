import { privateJsonWithCookies } from "@/src/server/http/responses";
import { buildClearCookies, destroySession, readSessionId } from "@/src/server/laliga/session";

export const dynamic = "force-dynamic";

/** POST /api/fantasy/auth/logout — borra la sesion del servidor y las cookies. */
export async function POST(request: Request) {
  const sessionId = readSessionId(request);
  if (sessionId) await destroySession(sessionId);
  return privateJsonWithCookies({ authenticated: false }, buildClearCookies());
}
