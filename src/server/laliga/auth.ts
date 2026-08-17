import { AUTH_CONFIG } from './config';
import { mensajeDeLogin } from './auth-errors.ts';
import { LaligaError } from './errors';

/**
 * Login contra el Azure AD B2C de LALIGA.
 *
 * Email + contraseña usa Resource Owner Password Credentials. Las cuentas
 * sociales (Google, Apple y Facebook) usan Authorization Code + PKCE desde el
 * contenedor iOS: el teléfono recibe únicamente el callback con `code`; el
 * intercambio por tokens se hace aquí, en servidor.
 */

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  /** Epoch en milisegundos en que caduca el access token. */
  expiresAt: number;
};

type B2CTokenResponse = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token_expires_in?: number;
  error?: string;
  error_description?: string;
};

function toTokenSet(payload: B2CTokenResponse): TokenSet {
  // El flujo interactivo de B2C puede entregar id_token sin access_token para
  // el scope openid. La API actual acepta el token emitido por esa política;
  // de todos modos cada login se valida contra /api/v3/user antes de crear sesión.
  const accessToken = payload.access_token ?? payload.id_token;
  if (!accessToken || !payload.refresh_token) {
    throw new LaligaError('invalid_response', 'La respuesta de login no trae tokens.', 'auth');
  }
  const ttl = (payload.expires_in ?? payload.id_token_expires_in ?? 3600) - 60;
  return {
    accessToken,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Math.max(ttl, 30) * 1000,
  };
}

async function postToken(policy: string, body: Record<string, string>): Promise<B2CTokenResponse> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_CONFIG.tokenUrl}?p=${policy}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
    throw new LaligaError(
      isTimeout ? 'timeout' : 'network',
      'No se pudo contactar con el login de LALIGA.',
      'auth',
    );
  }

  const payload = (await response.json().catch(() => ({}))) as B2CTokenResponse;

  if (!response.ok || payload.error) {
    const detail = payload.error_description?.split('\n')[0] ?? payload.error ?? `HTTP ${response.status}`;
    throw new LaligaError('unauthorized', mensajeDeLogin(detail), 'auth', 401);
  }

  return payload;
}

/** Intercambia email + contraseña por un juego de tokens. La contraseña no se guarda. */
export async function passwordLogin(email: string, password: string): Promise<TokenSet> {
  return toTokenSet(
    await postToken(AUTH_CONFIG.passwordPolicy, {
      grant_type: 'password',
      client_id: AUTH_CONFIG.clientId,
      scope: `openid ${AUTH_CONFIG.clientId} offline_access`,
      redirect_uri: AUTH_CONFIG.redirectUri,
      response_type: 'token id_token',
      username: email,
      password,
    }),
  );
}

/**
 * Completa el flujo social iniciado en iOS. El `codeVerifier` nunca se entrega
 * al plugin nativo: permanece en una cookie HttpOnly temporal del servidor.
 */
export async function exchangeAuthorizationCode(code: string, codeVerifier: string): Promise<TokenSet> {
  return toTokenSet(
    await postToken(AUTH_CONFIG.refreshPolicy, {
      grant_type: 'authorization_code',
      client_id: AUTH_CONFIG.clientId,
      code,
      redirect_uri: AUTH_CONFIG.redirectUri,
      code_verifier: codeVerifier,
      scope: 'openid offline_access',
    }),
  );
}

/** Renueva el access token a partir del refresh token. */
export async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const payload = await postToken(AUTH_CONFIG.refreshPolicy, {
    grant_type: 'refresh_token',
    client_id: AUTH_CONFIG.clientId,
    // Debe pedir el mismo scope que passwordLogin(): sin el resource scope
    // del clientId, el token renovado pierde audiencia sobre la API privada
    // y cada refresh deja la sesión colgada (ver aef9b8b, que lo quitó por
    // error al añadir el login social).
    scope: `openid ${AUTH_CONFIG.clientId} offline_access`,
    refresh_token: refreshToken,
  });
  if (!payload.refresh_token) payload.refresh_token = refreshToken;
  return toTokenSet(payload);
}
