import { NextRequest } from "next/server";
import {
  LALIGA_SESSION_COOKIE,
  isAllowedRequestOrigin,
  laligaSessionCookieOptions,
} from "../../../laliga-session";
import {
  getUserScopedSupabase,
  noStoreJson,
  privateBetaUnavailable,
} from "../shared";

export async function POST(request: NextRequest) {
  const unavailable = privateBetaUnavailable();
  if (unavailable) return unavailable;

  if (!isAllowedRequestOrigin(request)) {
    return noStoreJson({ error: "Origen de solicitud no permitido." }, { status: 403 });
  }

  const auth = await getUserScopedSupabase(request);
  if (!auth) {
    return noStoreJson(
      { error: "Inicia sesión en Fantasy Copilot para continuar." },
      { status: 401 },
    );
  }

  const response = noStoreJson({ connected: false });
  response.cookies.set(
    LALIGA_SESSION_COOKIE,
    "",
    laligaSessionCookieOptions(0),
  );
  return response;
}
