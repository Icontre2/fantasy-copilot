import { errorJson, privateJson, privateJsonWithCookies } from "@/src/server/http/responses";
import { getMyProfile } from "@/src/server/laliga/read";
import { buildSessionCookies, createSession } from "@/src/server/laliga/session";
import type { TokenSet } from "@/src/server/laliga/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TokenPayload = {
  access_token?: unknown;
  id_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  expires_on?: unknown;
  status?: {
    authenticate?: TokenPayload;
  };
};

/**
 * POST /api/fantasy/auth/token  { token }
 *
 * Vía de acceso para cuentas de LALIGA creadas con Google, Apple o Facebook.
 * El navegador de una web de terceros no puede recibir el redirect nativo que
 * LALIGA tiene registrado (`authredirect://com.lfp.laligafantasy`), pero sí se
 * puede importar un juego de tokens que el usuario haya obtenido al iniciar
 * sesión en la página oficial de LALIGA.
 *
 * Igual que en el login por contraseña, el token llega una vez a este endpoint,
 * se valida contra `/api/v3/user`, se convierte en nuestra sesión httpOnly y no
 * vuelve al JavaScript del navegador. Esta ruta nunca registra el token.
 */
export async function POST(request: Request) {
  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "El cuerpo de la petición no es JSON válido." }, 400);
  }

  const parsed = parseImportedToken(body.token);
  if (!parsed) {
    return privateJson(
      {
        error:
          "No encuentro un access_token válido. Pega la respuesta JSON completa del login de LALIGA o el token Bearer.",
      },
      400,
    );
  }

  try {
    // No confiamos en un JWT solo porque tenga forma de JWT: la API de LALIGA
    // decide si realmente pertenece a una sesión válida.
    const manager = await getMyProfile(parsed.accessToken);
    const sessionId = await createSession(parsed);
    return privateJsonWithCookies({ manager }, buildSessionCookies(sessionId));
  } catch (error) {
    return errorJson(error);
  }
}

function parseImportedToken(raw: unknown): TokenSet | null {
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text || text.length > 100_000) return null;

    if (text.startsWith("{")) {
      try {
        return tokenSetFromPayload(JSON.parse(text) as TokenPayload);
      } catch {
        return null;
      }
    }

    const bearer = text.replace(/^Bearer\s+/i, "").trim();
    if (!looksLikeToken(bearer)) return null;
    return {
      accessToken: bearer,
      refreshToken: "",
      expiresAt: expiryFromJwt(bearer) ?? Date.now() + 55 * 60 * 1000,
    };
  }

  if (raw && typeof raw === "object") {
    return tokenSetFromPayload(raw as TokenPayload);
  }

  return null;
}

function tokenSetFromPayload(payload: TokenPayload): TokenSet | null {
  // También acepta el objeto `auth` que algunas versiones de la web oficial
  // guardaban como `{ status: { authenticate: ... } }`.
  const source = payload.status?.authenticate ?? payload;
  const access = stringValue(source.access_token) ?? stringValue(source.id_token);
  if (!access || !looksLikeToken(access)) return null;

  const refresh = stringValue(source.refresh_token) ?? "";
  const expiresAt =
    expiryFromAbsolute(source.expires_on) ??
    expiryFromTtl(source.expires_in) ??
    expiryFromJwt(access) ??
    Date.now() + 55 * 60 * 1000;

  return { accessToken: access, refreshToken: refresh, expiresAt };
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function expiryFromAbsolute(value: unknown): number | null {
  const raw = numericValue(value);
  if (!raw || raw <= 0) return null;
  // Azure suele devolver segundos Unix; se toleran milisegundos por si cambia.
  const ms = raw > 10_000_000_000 ? raw : raw * 1000;
  return Math.max(Date.now() + 30_000, ms - 60_000);
}

function expiryFromTtl(value: unknown): number | null {
  const seconds = numericValue(value);
  if (!seconds || seconds <= 0) return null;
  return Date.now() + Math.max(seconds - 60, 30) * 1000;
}

function expiryFromJwt(token: string): number | null {
  const [, payload] = token.split(".");
  if (!payload) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    const exp = numericValue(decoded.exp);
    return exp ? Math.max(Date.now() + 30_000, exp * 1000 - 60_000) : null;
  } catch {
    return null;
  }
}

function looksLikeToken(value: string): boolean {
  // Los tokens actuales son JWT. No verificamos la firma aquí: la verificación
  // efectiva es pedir el perfil a la API privada de LALIGA antes de crear sesión.
  return value.length >= 80 && value.split(".").length >= 3;
}
