import { randomUUID } from 'node:crypto';
import { hasSupabaseAdmin, supabaseAdmin } from '@/src/server/storage/supabase-admin';
import { refreshTokens, type TokenSet } from './auth';
import {
  decodePortableTokenSet,
  decryptTokenSet,
  encodePortableTokenSet,
  encryptTokenSet,
  hasConfiguredEncryptionSecret,
} from './token-crypto';

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
 * SIN Supabase: la sesion viaja cifrada DENTRO de la cookie.
 *
 * SIN clave de cifrado en produccion: la sesion viaja temporalmente dentro de
 * una cookie Secure + httpOnly. Asi funciona entre distintas funciones de
 * Vercel. En cuanto hay clave estable vuelve a usarse AES-256-GCM.
 *
 * En todos los modos la cookie es `httpOnly`: JavaScript del navegador nunca
 * puede leer el token. Con clave configurada, ademas va cifrado con AES-256-GCM.
 */

import { SESSION_TTL_MS } from './session-cookie.ts';
import { diagnosticarSesion, type DiagnosticoDeSesion } from './session-mode.ts';

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
  return !hasSupabaseAdmin() || usingPortableCookieSessions();
}

/** Respaldo portable para instalaciones de Vercel aun sin clave estable. */
export function usingPortableCookieSessions(): boolean {
  return process.env.NODE_ENV === 'production' && !hasConfiguredEncryptionSecret();
}

/** Persistencia disponible para el historico economico. */
export function hasPersistentStorage(): boolean {
  return hasSupabaseAdmin() && !usingPortableCookieSessions();
}

/**
 * Que modo de sesion esta activo, para poder DECIRLO en pantalla.
 *
 * Lo unico que hace es leer el entorno y delegar en `session-mode.ts`, que es
 * donde vive la decision y donde se puede testear. No devuelve ningun secreto:
 * solo si cada variable esta puesta o no.
 */
export function diagnosticoDeSesion(): DiagnosticoDeSesion {
  return diagnosticarSesion({
    supabase: hasSupabaseAdmin(),
    claveExplicita: Boolean(process.env.SESSION_ENCRYPTION_KEY?.trim()),
    oidc: Boolean(process.env.VERCEL_OIDC_TOKEN?.trim()),
    produccion: process.env.NODE_ENV === 'production',
  });
}

export async function createSession(tokens: TokenSet): Promise<string> {
  // Modo cookie: el "identificador" ES la sesion cifrada. No se guarda nada.
  if (usingCookieSessions()) return empaquetarSesion(tokens);

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
    tokens = usingPortableCookieSessions()
      ? decodePortableTokenSet(row.encrypted_tokens)
      : decryptTokenSet(row.encrypted_tokens);
  } catch {
    // Clave de cifrado rotada o fila corrupta: la sesion ya no es recuperable.
    await destroySession(sessionId);
    return null;
  }

  if (Date.now() < tokens.expiresAt) return tokens.accessToken;

  /*
   * En modo cookie esta funcion no puede renovar: devuelve un `string` y la
   * sesion renovada hay que ESCRIBIRLA en la cookie de la respuesta, cosa que
   * desde aqui no se puede hacer. Quien tenga acceso a la respuesta usa
   * `renovarSesionDeCookie` (justo debajo); los demas ven la sesion caducada,
   * que es la verdad hasta que alguien la renueve.
   */
  if (usingCookieSessions()) return null;

  return refreshSession(sessionId, row.encrypted_tokens, tokens);
}

/**
 * Los tokens de LALIGA que hay detras de una sesion, tal cual.
 *
 * `getValidAccessToken` devuelve solo el access token, que es lo que necesita
 * quien va a llamar a LALIGA. Aqui hace falta el juego entero —incluido el
 * refresh token— para poder GUARDARLO en el enlace con Google: sin el, el enlace
 * duraria un dia y no serviria de nada.
 *
 * No renueva: devuelve lo que hay, caducado o no, y decide quien llama.
 */
export async function tokenSetDeSesion(sessionId: string | undefined): Promise<TokenSet | null> {
  if (!sessionId) return null;
  const row = await readSession(sessionId);
  if (!row) return null;
  try {
    return usingPortableCookieSessions()
      ? decodePortableTokenSet(row.encrypted_tokens)
      : decryptTokenSet(row.encrypted_tokens);
  } catch {
    return null;
  }
}

/**
 * Cuanto antes del vencimiento conviene renovar.
 *
 * Doce horas: con la app abriendose a diario, siempre se renueva antes de
 * caducar y la sesion no se acaba nunca. Mas margen seria pedirle un token
 * nuevo a LALIGA en cada visita sin necesidad.
 */
const MARGEN_DE_RENOVACION_MS = 12 * 60 * 60 * 1000;

/**
 * Los mismos tokens si todavia sirven; renovados si les queda poco o ya
 * caducaron; `null` si LALIGA rechaza el refresh y toca entrar de verdad.
 *
 * Es la unica regla temporal del sistema, en un solo sitio: la usan tanto la
 * renovacion de la cookie como el enlace con Google, y antes cada una llevaba su
 * copia.
 */
export async function tokensVigentes(tokens: TokenSet): Promise<TokenSet | null> {
  if (Date.now() + MARGEN_DE_RENOVACION_MS < tokens.expiresAt) return tokens;
  try {
    return await refreshTokens(tokens.refreshToken);
  } catch {
    return null;
  }
}

/** La sesion cifrada tal y como debe viajar en la cookie de este despliegue. */
export function empaquetarSesion(tokens: TokenSet): string {
  return usingPortableCookieSessions() ? encodePortableTokenSet(tokens) : encryptTokenSet(tokens);
}

/**
 * Renueva una sesion que vive DENTRO de la cookie.
 *
 * ── Por que existe ──────────────────────────────────────────────────────────
 * Sin base de datos, la sesion duraba lo que duraba el access token de LALIGA
 * —unas 24 h— y despues tocaba volver a escribir la contraseña. Todos los dias.
 * Es, de largo, lo que mas retencion se comia.
 *
 * Y no hacia falta: el REFRESH TOKEN viaja dentro de esa misma cookie, sin usar.
 * El codigo decia «sin almacen no hay donde dejar el token renovado», pero si lo
 * hay: **la cookie es el almacen**. Solo habia que volver a escribirla.
 *
 * Devuelve tambien la sesion cifrada porque quien llama TIENE que ponerla en la
 * respuesta. Si no lo hace, se habra gastado un refresh token para nada y —si
 * LALIGA lo rota— la cookie vieja se queda con uno ya usado.
 *
 * `null` cuando no hay nada que renovar, o cuando LALIGA rechaza el refresh
 * (sesion revocada, contraseña cambiada): entonces toca entrar de verdad.
 */
export async function renovarSesionDeCookie(
  sessionId: string | undefined,
): Promise<{ accessToken: string; sesion: string } | null> {
  if (!sessionId || !usingCookieSessions()) return null;

  let tokens: TokenSet;
  try {
    tokens = usingPortableCookieSessions()
      ? decodePortableTokenSet(sessionId)
      : decryptTokenSet(sessionId);
  } catch {
    return null; // Clave rotada o cookie manipulada: no es recuperable.
  }

  // Todavia le queda cuerda de sobra: no se molesta a LALIGA.
  if (Date.now() + MARGEN_DE_RENOVACION_MS < tokens.expiresAt) return null;

  const frescos = await tokensVigentes(tokens);
  if (!frescos) return null;
  return { accessToken: frescos.accessToken, sesion: empaquetarSesion(frescos) };
}

// --- Cookie -----------------------------------------------------------------

export {
  buildClearCookies,
  buildSessionCookies,
  readSessionId,
  SESSION_COOKIE,
} from './session-cookie.ts';
