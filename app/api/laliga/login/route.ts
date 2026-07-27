import { NextRequest } from "next/server";
import {
  LALIGA_CLIENT_ID,
  LALIGA_SESSION_COOKIE,
  LALIGA_TOKEN_URL,
  isAllowedRequestOrigin,
  laligaSessionCookieOptions,
  sealLaligaSession,
} from "../../../laliga-session";
import {
  getUserScopedSupabase,
  noStoreJson,
  privateBetaUnavailable,
  readSmallJson,
} from "../shared";
import { takeRateLimit } from "../rate-limit";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

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

  const rate = takeRateLimit("login:" + auth.user.id, 5, 10 * 60 * 1000);
  if (!rate.allowed) {
    const response = noStoreJson(
      { error: "Demasiados intentos. Espera antes de volver a probar." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return response;
  }

  let body: LoginBody;
  try {
    body = (await readSmallJson(request, 4_096)) as LoginBody;
  } catch {
    return noStoreJson({ error: "Datos de acceso no válidos." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (
    !email ||
    email.length > 320 ||
    !email.includes("@") ||
    !password ||
    password.length > 1_024
  ) {
    return noStoreJson(
      { error: "Introduce el email y la contraseña de LALIGA Fantasy." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const tokenResponse = await fetch(LALIGA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: LALIGA_CLIENT_ID,
        scope: `openid ${LALIGA_CLIENT_ID} offline_access`,
        response_type: "token id_token",
        username: email,
        password,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!tokenResponse.ok) {
      if (tokenResponse.status === 429) {
        return noStoreJson(
          { error: "LALIGA está limitando los intentos temporalmente." },
          { status: 429 },
        );
      }
      return noStoreJson(
        {
          error:
            "No se pudo iniciar sesión. Revisa los datos; las cuentas solo sociales no son compatibles.",
        },
        { status: 401 },
      );
    }

    const tokenBody = (await tokenResponse.json()) as {
      access_token?: unknown;
    };
    const accessToken =
      typeof tokenBody.access_token === "string" ? tokenBody.access_token : "";
    const sealed = await sealLaligaSession(accessToken, auth.user.id);

    const response = noStoreJson({
      connected: true,
      expiresAt: new Date(sealed.expiresAt * 1000).toISOString(),
    });
    response.cookies.set(
      LALIGA_SESSION_COOKIE,
      sealed.value,
      laligaSessionCookieOptions(sealed.maxAge),
    );
    return response;
  } catch {
    return noStoreJson(
      { error: "No se pudo conectar con el acceso de LALIGA." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
