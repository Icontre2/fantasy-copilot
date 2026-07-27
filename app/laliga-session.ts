export const LALIGA_CLIENT_ID = "af88bcff-1157-40a0-b579-030728aacf0b";
export const LALIGA_TOKEN_URL =
  "https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_ResourceOwnerv2";
export const LALIGA_EXPECTED_ISSUER =
  "https://login.laliga.es/335316eb-f606-4361-bb86-35a7edcdcec1/v2.0/";
export const LALIGA_SESSION_COOKIE = "fantasy_copilot_laliga_session";

type TokenPayload = {
  aud?: string | string[];
  exp?: number;
  iss?: string;
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function readTokenPayload(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as unknown;
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
