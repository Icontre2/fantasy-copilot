import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/src/server/storage/supabase-admin';
import { refreshTokens, type TokenSet } from './auth';
import { decryptTokenSet, encryptTokenSet } from './token-crypto';

/**
 * Sesion del conector privado.
 *
 * Al navegador viaja UNICAMENTE un identificador opaco en una cookie httpOnly.
 * Los tokens de LALIGA se guardan cifrados en Supabase (`fantasy_sessions`), de
 * forma que ni el cliente ni una lectura directa de la tabla los expone.
 */

export const SESSION_COOKIE = 'llf_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/** Refrescos en vuelo, para no lanzar dos a la vez sobre la misma sesion. */
const inflight = ((globalThis as { __llfRefreshes?: Map<string, Promise<string | null>> })
  .__llfRefreshes ??= new Map<string, Promise<string | null>>());

type SessionRow = { encrypted_tokens: string };

export async function createSession(tokens: TokenSet): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  const db = supabaseAdmin();

  // Limpieza oportunista: sin esto la tabla solo crece.
  await db.from('fantasy_sessions').delete().lt('expires_at', now.toISOString());

  const { error } = await db.from('fantasy_sessions').insert({
    id,
    encrypted_tokens: encryptTokenSet(tokens),
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  });
  if (error) throw new Error(`No se pudo crear la sesion: ${error.message}`);

  return id;
}

export async function destroySession(sessionId: string): Promise<void> {
  await supabaseAdmin().from('fantasy_sessions').delete().eq('id', sessionId);
}

async function readSession(sessionId: string): Promise<SessionRow | null> {
  const { data } = await supabaseAdmin()
    .from('fantasy_sessions')
    .select('encrypted_tokens')
    .eq('id', sessionId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle<SessionRow>();
  return data ?? null;
}

/**
 * Renueva los tokens de una sesion caducada.
 *
 * El UPDATE lleva `.eq('encrypted_tokens', previous)` como comparacion
 * optimista: si otra instancia refresco primero, no se pisa su resultado —
 * se relee la fila y se usa el token que ya dejo escrito.
 */
async function refreshSession(sessionId: string, previous: string, tokens: TokenSet): Promise<string | null> {
  const active = inflight.get(sessionId);
  if (active) return active;

  const task = (async () => {
    const db = supabaseAdmin();
    try {
      const fresh = await refreshTokens(tokens.refreshToken);
      const { data } = await db
        .from('fantasy_sessions')
        .update({ encrypted_tokens: encryptTokenSet(fresh), updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('encrypted_tokens', previous)
        .select('id');

      if (data && data.length > 0) return fresh.accessToken;

      const current = await readSession(sessionId);
      return current ? decryptTokenSet(current.encrypted_tokens).accessToken : null;
    } catch {
      // El refresh token ya no vale: se borra SOLO la version que fallo, para no
      // tumbar un refresh concurrente que si haya funcionado.
      await db.from('fantasy_sessions').delete().eq('id', sessionId).eq('encrypted_tokens', previous);
      return null;
    }
  })().finally(() => inflight.delete(sessionId));

  inflight.set(sessionId, task);
  return task;
}

/**
 * Access token valido para la sesion, renovandolo si hace falta.
 * `null` si la sesion no existe, esta caducada o el refresh fallo.
 */
export async function getValidAccessToken(sessionId: string | undefined): Promise<string | null> {
  if (!sessionId) return null;

  const row = await readSession(sessionId);
  if (!row) return null;

  let tokens: TokenSet;
  try {
    tokens = decryptTokenSet(row.encrypted_tokens);
  } catch {
    // Clave de cifrado rotada o fila corrupta: la sesion ya no es recuperable.
    await destroySession(sessionId);
    return null;
  }

  if (Date.now() < tokens.expiresAt) return tokens.accessToken;
  return refreshSession(sessionId, row.encrypted_tokens, tokens);
}

// --- Cookie -----------------------------------------------------------------

export function readSessionId(request: Request): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function buildSessionCookie(sessionId: string): string {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function buildClearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
