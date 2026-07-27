import { NextRequest } from "next/server";
import {
  LALIGA_SESSION_COOKIE,
  laligaSessionCookieOptions,
} from "../../../laliga-session";
import {
  getLaligaSession,
  getUserScopedSupabase,
  noStoreJson,
  privateBetaUnavailable,
} from "../shared";

export async function GET(request: NextRequest) {
  const unavailable = privateBetaUnavailable();
  if (unavailable) return unavailable;

  const auth = await getUserScopedSupabase(request);
  if (!auth) {
    return noStoreJson(
      { error: "Inicia sesión en Fantasy Copilot para continuar." },
      { status: 401 },
    );
  }

  const session = await getLaligaSession(request, auth.user.id);
  if (!session) {
    const response = noStoreJson({ connected: false });
    response.cookies.set(
      LALIGA_SESSION_COOKIE,
      "",
      laligaSessionCookieOptions(0),
    );
    return response;
  }

  return noStoreJson({
    connected: true,
    expiresAt: new Date(session.expiresAt * 1000).toISOString(),
  });
}
