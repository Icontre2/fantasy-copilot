import { createHash, randomBytes } from "node:crypto";
import { AUTH_CONFIG } from "@/src/server/laliga/config";
import { privateJson } from "@/src/server/http/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OAUTH_COOKIE = "llf_mobile_oauth";
const OAUTH_TTL_SECONDS = 5 * 60;

function base64url(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buffer.toString("base64url");
}

export async function POST() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(32).toString("base64url");

  const authorizeUrl = new URL(
    "https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/authorize",
  );
  authorizeUrl.search = new URLSearchParams({
    p: AUTH_CONFIG.refreshPolicy,
    client_id: AUTH_CONFIG.clientId,
    response_type: "code",
    redirect_uri: AUTH_CONFIG.redirectUri,
    scope: "openid offline_access",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    nonce: state,
  }).toString();

  const transient = base64url(JSON.stringify({ verifier, state, issuedAt: Date.now() }));
  const response = privateJson({ authorizeUrl: authorizeUrl.toString() });
  // `Secure` solo en producción: igual que `atributos()` en cookies.ts — con
  // Secure fijo, esta cookie se descartaría en silencio en local/preview sin
  // HTTPS y el flujo PKCE parecería caducado en /complete.
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  response.headers.append(
    "Set-Cookie",
    `${OAUTH_COOKIE}=${transient}; Path=/api/fantasy/auth/mobile; Max-Age=${OAUTH_TTL_SECONDS}; HttpOnly;${secure} SameSite=Lax`,
  );
  return response;
}

export { OAUTH_COOKIE, OAUTH_TTL_SECONDS };
