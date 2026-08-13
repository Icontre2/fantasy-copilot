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
 * ── Dos almacenes, y por que ─────────────────────────────────────────────────
 * Con Supabase configurado, los tokens se guardan cifrados en `fantasy_sessions`.
 * Es el modo de siempre y el unico valido en produccion: sobrevive a reinicios y
 * lo comparten varias instancias.
 *
 * SIN Supabase, y solo fuera de produccion, la sesion vive en memoria del
 * proceso. Existe para que se pueda mirar la app sin montar antes una base de
 * datos: `npm run dev`, iniciar sesion, y ver la liga de verdad. Las cuatro
 * pantallas que solo leen de LALIGA (Liga, Alertas, Mercado, Exportar) funcionan
 * asi; Economia no, porque es un historico y necesita donde guardarlo.
 *
 * Lo que se pierde en ese modo, y hay que asumir: reiniciar el proceso cierra la
 * sesion, y no vale para varias instancias. Por eso esta prohibido en
 * produccion — ahi la ausencia de Supabase es un error de configuracion, no una
 * comodidad.
 */

export const SESSION_COOKIE = 'llf_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/** Refrescos en vuelo, para no lanzar dos a la vez sobre la misma sesion. */
const inflight = ((globalThis as { __llfRefreshes?: Map<string, Promise<string | null>> })
  .__llfRefreshes ??= new Map<string, Promise<string | null>>());

/** Sesiones en memoria del modo sin base de datos. Colgadas de globalThis para
 *  sobrevivir al hot-reload de `next dev`, que recarga los modulos. */
const memoryStore = ((globalThis as { __llfMemorySessions?: Map<string, { tokens: string; expiresAt: number }> })
  .__llfMemorySessions ??= new Map<string, { tokens: string; expiresAt: number }>());

type SessionRow = { encrypted_tokens: string };

/**
 * `true` cuando la sesion vive en memoria en vez de en Supabase.
 *
 * En produccion nunca: si falta la configuracion, `supabaseAdmin()` lanza con su
 * mensaje y el fallo se ve, en vez de arrancar en un modo que perderia las
 * sesiones en cada despliegue.
 */
export function usingMemorySessions(): boolean {
  return !hasSupabaseAdmin() && process.env.NODE_ENV !== 'production';
}

/** Persistencia disponible para el historico economico. */
export function hasPersistentStorage(): boolean {
  return hasSupabaseAdmin();
}

export async function createSession(tokens: TokenSet): Promise<string> {
  const id = randomUUID();
  const now = new Date();

  if (usingMemorySessions()) {
    memoryStore.set(id, {
      tokens: encryptTokenSet(tokens),
      expiresAt: now.getTime() + SESSION_TTL_MS,
    });
    return id;
  }

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
  if (usingMemorySessions()) {
    memoryStore.delete(sessionId);
    return;
  }
  await supabaseAdmin().from('fantasy_sessions').delete().eq('id', sessionId);
}

async function readSession(sessionId: string): Promise<SessionRow | null> {
  if (usingMemorySessions()) {
    const entry = memoryStore.get(sessionId);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      memoryStore.delete(sessionId);
      return null;
    }
    return { encrypted_tokens: entry.tokens };
  }

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
 * resultado — se relee la fila y se usa el token que ya dejo escrito. En memoria
 * no hace falta: hay un solo proceso.
 */
async function refreshSession(sessionId: string, previous: string, tokens: TokenSet): Promise<string | null> {
  const active = inflight.get(sessionId);
  if (active) return active;

  const task = (async () => {
    try {
      const fresh = await refreshTokens(tokens.refreshToken);

      if (usingMemorySessions()) {
        memoryStore.set(sessionId, {
          tokens: encryptTokenSet(fresh),
          expiresAt: Date.now() + SESSION_TTL_MS,
        });
        return fresh.accessToken;
      }

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
      if (usingMemorySessions()) {
        const entry = memoryStore.get(sessionId);
        if (entry?.tokens === previous) memoryStore.delete(sessionId);
      } else {
        await supabaseAdmin()
          .from('fantasy_sessions')
          .delete()
          .eq('id', sessionId)
          .eq('encrypted_tokens', previous);
      }
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
