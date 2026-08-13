import { randomUUID } from 'node:crypto';
import { hasSupabaseAdmin, supabaseAdmin } from '@/src/server/storage/supabase-admin';
import { refreshTokens, type TokenSet } from './auth';
import { decryptTokenSet, encryptTokenSet } from './token-crypto';

/**
 * Sesion del conector privado.
 *
 * Al navegador viaja UNICAMENTE un identificador opaco en una cookie httpOnly.
 * El token de LALIGA no sale del servidor en ningun caso.
 *
 * ── Dos modos ────────────────────────────────────────────────────────────────
 * CON Supabase: los tokens se guardan cifrados en `fantasy_sessions` y la cookie
 * lleva solo un id opaco. La sesion se renueva sola y dura 30 dias.
 *
 * SIN Supabase: la sesion viaja cifrada DENTRO de la cookie. No hay estado en
 * servidor, asi que funciona igual con una instancia que con veinte — se puede
 * desplegar sin base de datos. El precio es que no hay donde guardar el token
 * renovado: la sesion dura lo que dura el access token de LALIGA (~24 h) y
 * despues toca volver a entrar.
 *
 * En los dos modos el token va cifrado con AES-256-GCM y la cookie es
 * `httpOnly`: el navegador nunca puede leer el token.
 */

import { SESSION_TTL_MS } from './session-cookie.ts';

/** Refrescos en vuelo, para no lanzar dos a la vez sobre la misma sesion. */
const inflight = ((globalThis as { __llfRefreshes?: Map<string, Promise<string | null>> })
  .__llfRefreshes ??= new Map<string, Promise<string | null>>());

type SessionRow = { encrypted_tokens: string };

/**
 * Sin Supabase, la sesion viaja CIFRADA DENTRO DE LA COOKIE.
 *
 * Es lo que permite desplegar la app sin base de datos: no hay estado en el
 * servidor que compartir, asi que funciona igual con una instancia que con
 * veinte. El token sigue sin ser legible por el navegador (AES-256-GCM y
 * `httpOnly`), y la clave no sale del servidor.
 *
 * El precio, y hay que decirlo: sin sitio donde guardar el token renovado, la
 * sesion dura lo que dura el access token de LALIGA (~24 h). Al caducar toca
 * volver a entrar. Con Supabase configurado no pasa: se renueva sola.
 */
export function usingCookieSessions(): boolean {
  return !hasSupabaseAdmin();
}

/** Persistencia disponible para el historico economico. */
export function hasPersistentStorage(): boolean {
  return hasSupabaseAdmin();
}

export async function createSession(tokens: TokenSet): Promise<string> {
  // Modo cookie: el "identificador" ES la sesion cifrada. No se guarda nada.
  if (usingCookieSessions()) return encryptTokenSet(tokens);

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
  // En modo cookie no hay nada que borrar en servidor: basta con caducar la
  // cookie, que es lo que hace la ruta de logout.
  if (usingCookieSessions()) return;
  await supabaseAdmin().from('fantasy_sessions').delete().eq('id', sessionId);
}

async function readSession(sessionId: string): Promise<SessionRow | null> {
  if (usingCookieSessions()) return { encrypted_tokens: sessionId };

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
 * En Supabase el UPDATE lleva `.eq('encrypted_tokens', previous)` como
 * comparacion optimista: si otra instancia refresco primero, no se pisa su
 * resultado — se relee la fila y se usa el token que ya dejo escrito.
 *
 * Solo aplica al modo Supabase: en modo cookie no hay nada que renovar.
 */
async function refreshSession(sessionId: string, previous: string, tokens: TokenSet): Promise<string | null> {
  const active = inflight.get(sessionId);
  if (active) return active;

  const task = (async () => {
    try {
      const fresh = await refreshTokens(tokens.refreshToken);

      const db = supabaseAdmin();
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
      await supabaseAdmin()
        .from('fantasy_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('encrypted_tokens', previous);
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

  // Sin almacen no hay donde dejar el token renovado, asi que no se renueva:
  // la sesion caduca y el usuario vuelve a entrar. Fingir lo contrario dejaria
  // una cookie que ya no sirve.
  if (usingCookieSessions()) return null;

  return refreshSession(sessionId, row.encrypted_tokens, tokens);
}

// --- Cookie -----------------------------------------------------------------

export {
  buildClearCookies,
  buildSessionCookies,
  readSessionId,
  SESSION_COOKIE,
} from './session-cookie.ts';
