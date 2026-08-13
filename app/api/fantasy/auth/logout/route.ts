import { privateJsonWithCookie } from "@/src/server/http/responses";
import { buildClearCookie, destroySession, readSessionId } from "@/src/server/laliga/session";

export const dynamic = "force-dynamic";

/** POST /api/fantasy/auth/logout — borra la sesion del servidor y la cookie. */
export async function POST(request: Request) {
  const sessionId = readSessionId(request);
  if (sessionId) await destroySession(sessionId);
  return privateJsonWithCookie({ authenticated: false }, buildClearCookie());
}
