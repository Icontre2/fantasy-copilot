export const LALIGA_CLIENT_ID = "af88bcff-1157-40a0-b579-030728aacf0b";
export const LALIGA_TOKEN_URL =
  "https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_ResourceOwnerv2";
export const LALIGA_EXPECTED_ISSUER =
  "https://login.laliga.es/335316eb-f606-4361-bb86-35a7edcdcec1/v2.0/";
export const LALIGA_SESSION_COOKIE = "fantasy_copilot_laliga_session";

const SESSION_VERSION = "v1";
const SESSION_AAD = "fantasy-copilot:laliga-session:v1";
const MIN_SESSION_SECRET_BYTES = 32;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type TokenPayload = {
  aud?: string | string[];
  exp?: number;
  iss?: string;
};

type SealedSessionPayload = {
  accessToken: string;
  expiresAt: number;
  userId: string;
};

export type LaligaSession = {
  accessToken: string;
  expiresAt: number;
};

function decodeBase64UrlText(value: string): string {
  const bytes = decodeBase64UrlBytes(value);
  return decoder.decode(bytes);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64UrlBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function getSessionSecret(): string {
  const secret = process.env.LALIGA_SESSION_SECRET ?? "";
  if (encoder.encode(secret).byteLength < MIN_SESSION_SECRET_BYTES) {
    throw new Error("La sesión privada de LALIGA no está configurada.");
  }
  return secret;
}

async function getSessionKey(): Promise<CryptoKey> {
  const material = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(getSessionSecret()),
  );
  return crypto.subtle.importKey(
    "raw",
    material,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export function isLaligaPrivateBetaConfigured(): boolean {
  if (process.env.LALIGA_PRIVATE_BETA_ENABLED !== "true") return false;
  try {
    getSessionSecret();
    return true;
  } catch {
    return false;
  }
}

export function readTokenPayload(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(decodeBase64UrlText(parts[1])) as unknown;
    return typeof payload === "object" && payload !== null
      ? (payload as TokenPayload)
      : null;
  } catch {
    return null;
  }
}

export function getLaligaTokenMaxAge(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): number | null {
  const payload = readTokenPayload(token);
  if (!payload || payload.iss !== LALIGA_EXPECTED_ISSUER) return null;

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(LALIGA_CLIENT_ID)) return null;
  if (!Number.isFinite(payload.exp) || (payload.exp ?? 0) <= nowSeconds + 30) {
    return null;
  }

  return Math.min((payload.exp as number) - nowSeconds, 24 * 60 * 60);
}

export async function sealLaligaSession(
  accessToken: string,
  userId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<{ value: string; maxAge: number; expiresAt: number }> {
  const maxAge = getLaligaTokenMaxAge(accessToken, nowSeconds);
  if (!maxAge || !userId) throw new Error("La sesión de LALIGA no es válida.");

  const payload: SealedSessionPayload = {
    accessToken,
    expiresAt: nowSeconds + maxAge,
    userId,
  };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: encoder.encode(SESSION_AAD),
    },
    await getSessionKey(),
    encoder.encode(JSON.stringify(payload)),
  );

  return {
    value:
      SESSION_VERSION +
      "." +
      encodeBase64Url(iv) +
      "." +
      encodeBase64Url(new Uint8Array(ciphertext)),
    maxAge,
    expiresAt: payload.expiresAt,
  };
}

export async function openLaligaSession(
  value: string,
  expectedUserId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<LaligaSession | null> {
  const [version, encodedIv, encodedCiphertext, extra] = value.split(".");
  if (
    version !== SESSION_VERSION ||
    !encodedIv ||
    !encodedCiphertext ||
    extra !== undefined ||
    value.length > 8_192
  ) {
    return null;
  }

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: decodeBase64UrlBytes(encodedIv),
        additionalData: encoder.encode(SESSION_AAD),
      },
      await getSessionKey(),
      decodeBase64UrlBytes(encodedCiphertext),
    );
    const payload = JSON.parse(decoder.decode(plaintext)) as unknown;
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("accessToken" in payload) ||
      !("expiresAt" in payload) ||
      !("userId" in payload) ||
      typeof payload.accessToken !== "string" ||
      typeof payload.expiresAt !== "number" ||
      typeof payload.userId !== "string" ||
      payload.userId !== expectedUserId ||
      payload.expiresAt <= nowSeconds
    ) {
      return null;
    }

    const upstreamMaxAge = getLaligaTokenMaxAge(payload.accessToken, nowSeconds);
    if (!upstreamMaxAge || nowSeconds + upstreamMaxAge < payload.expiresAt - 1) {
      return null;
    }

    return {
      accessToken: payload.accessToken,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export function isAllowedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProto ?? new URL(request.url).protocol.replace(":", "");

  try {
    return new URL(origin).origin === protocol + "://" + host;
  } catch {
    return false;
  }
}

export const laligaSessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});