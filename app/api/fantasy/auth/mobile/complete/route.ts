import { errorJson, privateJson, privateJsonWithCookies } from "@/src/server/http/responses";
import { exchangeAuthorizationCode } from "@/src/server/laliga/auth";
import { getMyProfile } from "@/src/server/laliga/read";
import { buildSessionCookies, createSession } from "@/src/server/laliga/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OAUTH_COOKIE = "llf_mobile_oauth";
const OAUTH_TTL_MS = 5 * 60 * 1000;

type OAuthState = {
  verifier: string;
  state: string;
  issuedAt: number;
};

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=") || null;
  }
  return null;
}

function decodeState(raw: string | null): OAuthState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<OAuthState>;
    if (
      typeof parsed.verifier !== "string" ||
      typeof parsed.state !== "string" ||
      typeof parsed.issuedAt !== "number" ||
      Date.now() - parsed.issuedAt > OAUTH_TTL_MS
    ) {
      return null;
    }
    return parsed as OAuthState;
  } catch {
    return null;
  }
}

function clearOAuthCookie(response: Response): Response {
  response.headers.append(
    "Set-Cookie",
    `${OAUTH_COOKIE}=; Path=/api/fantasy/auth/mobile; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  );
  return response;
}

export async function POST(request: Request) {
  let body: { callbackUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "El cuerpo de la petición no es JSON válido." }, 400);
  }

  if (typeof body.callbackUrl !== "string" || body.callbackUrl.length > 10_000) {
    return privateJson({ error: "Falta el callback de LALIGA." }, 400);
  }

  let callback: URL;
  try {
    callback = new URL(body.callbackUrl);
  } catch {
    return privateJson({ error: "El callback de LALIGA no es una URL válida." }, 400);
  }

  if (callback.protocol !== "authredirect:" || callback.hostname !== "com.lfp.laligafantasy") {
    return privateJson({ error: "El callback no pertenece al login oficial de LALIGA Fantasy." }, 400);
  }

  const oauth = decodeState(readCookie(request, OAUTH_COOKIE));
  if (!oauth) {
    return clearOAuthCookie(
      privateJson({ error: "El intento de acceso ha caducado. Vuelve a iniciar sesión." }, 400),
    );
  }

  const returnedState = callback.searchParams.get("state");
  if (!returnedState || returnedState !== oauth.state) {
    return clearOAuthCookie(privateJson({ error: "La respuesta de acceso no coincide con la solicitud." }, 400));
  }

  const providerError = callback.searchParams.get("error_description") ?? callback.searchParams.get("error");
  if (providerError) {
    return clearOAuthCookie(privateJson({ error: `LALIGA canceló el acceso: ${providerError}` }, 401));
  }

  const code = callback.searchParams.get("code");
  if (!code) {
    return clearOAuthCookie(privateJson({ error: "LALIGA no devolvió el código de autorización." }, 400));
  }

  try {
    const tokens = await exchangeAuthorizationCode(code, oauth.verifier);
    // La sesión solo se crea si el token realmente abre el perfil privado.
    const manager = await getMyProfile(tokens.accessToken);
    const sessionId = await createSession(tokens);
    const response = privateJsonWithCookies({ manager }, buildSessionCookies(sessionId));
    return clearOAuthCookie(response);
  } catch (error) {
    return clearOAuthCookie(errorJson(error));
  }
}
