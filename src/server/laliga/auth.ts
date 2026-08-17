import { AUTH_CONFIG } from './config';
import { mensajeDeLogin } from './auth-errors.ts';
import { LaligaError } from './errors';

/**
 * Login contra el Azure AD B2C de LALIGA (flujo Resource Owner Password
 * Credentials), el mismo que usa la app oficial para el login por email.
 *
 * ── Lo que hay que saber antes de tocar esto ─────────────────────────────────
 * La contrasena del usuario atraviesa este servidor para intercambiarla por
 * tokens. **No se guarda en ningun sitio**: se usa una vez en `passwordLogin` y
 * se descarta con el ambito de la funcion. Lo que se conserva es el juego de
 * tokens, cifrado (`token-crypto.ts`) y solo en servidor.
 *
 * Limitaciones reales del flujo, no negociables:
 *  - No funciona con cuentas de Google, Apple ni Facebook. Esas cuentas no
 *    tienen contrasena en B2C y el login fallara con 401.
 *  - La API espera el `access_token`, no el `id_token`.
 *
 * Uso personal. Las condiciones de LALIGA Fantasy limitan el juego al ambito
 * personal y privado; ver `docs/AUDITORIA_FASE_1.md`.
 */

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  /** Epoch en milisegundos en que caduca el access token. */
  expiresAt: number;
};

type B2CTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

function toTokenSet(payload: B2CTokenResponse): TokenSet {
  if (!payload.access_token || !payload.refresh_token) {
    throw new LaligaError('invalid_response', 'La respuesta de login no trae tokens.', 'auth');
  }
  // Se renueva 60s antes del vencimiento real para evitar carreras.
  const ttl = (payload.expires_in ?? 3600) - 60;
  return {
    accessToken: payload.access_token,
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
    /*
     * B2C detalla el motivo (credenciales, cuenta social...) en
     * `error_description`. Se corta en la primera linea porque el resto son ids
     * de correlacion internos, y se traduce: el texto crudo llegaba a la
     * pantalla en ingles y con un codigo `AADB2Cnnnnn` que no le dice nada a
     * quien intenta entrar.
     */
    const detail = payload.error_description?.split('\n')[0] ?? payload.error ?? `HTTP ${response.status}`;
    throw new LaligaError('unauthorized', mensajeDeLogin(detail), 'auth', 401);
  }

  return payload;
}

/** Intercambia email + contrasena por un juego de tokens. La contrasena no se guarda. */
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

/** Renueva el access token a partir del refresh token. */
export async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const payload = await postToken(AUTH_CONFIG.refreshPolicy, {
    grant_type: 'refresh_token',
    client_id: AUTH_CONFIG.clientId,
    scope: `openid ${AUTH_CONFIG.clientId} offline_access`,
    refresh_token: refreshToken,
  });
  // Algunos flujos no rotan el refresh token: se conserva el anterior si falta.
  if (!payload.refresh_token) payload.refresh_token = refreshToken;
  return toTokenSet(payload);
}
