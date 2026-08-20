// Rutas relativas a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { decryptTokenSet, encryptTokenSet } from '../laliga/token-crypto.ts';
import { configAuth } from './supabase-oauth.ts';
import type { TokenSet } from '../laliga/auth.ts';

/**
 * El enlace entre "quien eres" y "tu cuenta de LALIGA".
 *
 * Entrar con Google dice QUIEN eres, pero no da ningun permiso sobre LALIGA:
 * son dos accesos distintos y LALIGA no sabe nada de Google. Asi que la primera
 * vez hay que conectar la cuenta de LALIGA una sola vez con su email y su
 * contraseña, y a partir de ahi el enlace recuerda cual es.
 *
 * ── Quien puede tocar esta tabla ─────────────────────────────────────────────
 * Antes: solo `service_role`. Y esa clave no estaba puesta, asi que el enlace no
 * se guardaba NUNCA y "entrar con Google" acababa pidiendote la contraseña de
 * LALIGA igual — o sea, no servia para nada.
 *
 * Ahora hay dos credenciales posibles y las dos valen:
 *
 *   - `credencialAdmin()`: `service_role`, si esta configurada. Salta RLS y puede
 *     leer el enlace en cualquier momento, incluso sin el usuario delante.
 *   - `credencialDeUsuario(jwt)`: la clave publicable mas el JWT del propio
 *     usuario, recien salido del canje con Supabase. Con la politica de la tabla
 *     puesta, eso le deja tocar SU fila y ninguna otra. No hace falta ninguna
 *     clave secreta nueva: funciona con lo que ya esta configurado.
 *
 * Se habla con PostgREST por HTTP en vez de montar el cliente de Supabase porque
 * el cliente ata la credencial al construirse y aqui cambia en cada peticion.
 *
 * Los tokens se guardan cifrados con la misma clave y el mismo formato que las
 * sesiones normales (AES-256-GCM, ver `token-crypto.ts`): la base nunca ve un
 * token en claro ni con acceso directo a la fila.
 */

export type Enlace = { tokens: TokenSet; email: string | null };

/** Con que permiso se habla con la base para esta operacion. */
export type Credencial = { url: string; apikey: string; bearer: string };

const TABLA = 'fantasy_links';

/** El prefijo del identificador. La politica de RLS cuenta con el. */
export const PREFIJO_SUPABASE = 'supabase:';

/** El identificador de fila que le corresponde a un usuario de Supabase. */
export function identidadDeUsuario(idDeSupabase: string): string {
  return `${PREFIJO_SUPABASE}${idDeSupabase}`;
}

/**
 * La credencial administrativa, si este despliegue la tiene.
 *
 * Es la unica que puede leer el enlace SIN el usuario delante, que es lo que
 * necesita `access.ts` en cada peticion normal.
 */
export function credencialAdmin(): Credencial | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), apikey: key, bearer: key };
}

/**
 * La credencial del propio usuario, a partir del JWT que devuelve Supabase al
 * canjear el codigo. Solo sirve durante esa peticion, y solo para su fila.
 */
export function credencialDeUsuario(jwt: string): Credencial | null {
  const config = configAuth();
  return config ? { url: config.url, apikey: config.apiKey, bearer: jwt } : null;
}

export function hayAlmacenDeEnlaces(): boolean {
  return credencialAdmin() !== null;
}

/**
 * Si en este despliegue tiene sentido GUARDAR un enlace.
 *
 * Puro para poder probarlo. La regla: hace falta una clave de cifrado que NO
 * cambie entre despliegues. Con la de Vercel —que rota— la fila quedaria
 * ilegible en el siguiente despliegue y el usuario veria "ya conectaste LALIGA"
 * sin poder entrar, que es peor que no haber guardado nada. En local no aplica:
 * alli la clave muere con el proceso y eso ya se sabe.
 */
export function puedeGuardarEnlace(entorno: { claveExplicita: boolean; produccion: boolean }): boolean {
  return entorno.claveExplicita || !entorno.produccion;
}

/** La misma pregunta, leyendo el entorno de verdad. */
export function seGuardanEnlaces(): boolean {
  return puedeGuardarEnlace({
    claveExplicita: Boolean(process.env.SESSION_ENCRYPTION_KEY?.trim()),
    produccion: process.env.NODE_ENV === 'production',
  });
}

async function pedir(
  credencial: Credencial,
  ruta: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<Response> {
  const { prefer, ...resto } = init;
  return fetch(`${credencial.url}/rest/v1/${ruta}`, {
    ...resto,
    headers: {
      apikey: credencial.apikey,
      Authorization: `Bearer ${credencial.bearer}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
}

type Fila = { encrypted_tokens: string; laliga_email: string | null };

/** El enlace de esa identidad, o `null` si todavia no ha conectado LALIGA. */
export async function leerEnlace(credencial: Credencial, identidad: string): Promise<Enlace | null> {
  const respuesta = await pedir(
    credencial,
    `${TABLA}?id=eq.${encodeURIComponent(identidad)}&select=encrypted_tokens,laliga_email&limit=1`,
  );
  if (!respuesta.ok) return null;

  const filas = (await respuesta.json().catch(() => null)) as Fila[] | null;
  const fila = filas?.[0];
  if (!fila) return null;

  try {
    return { tokens: decryptTokenSet(fila.encrypted_tokens), email: fila.laliga_email };
  } catch {
    /*
     * Clave de cifrado rotada: la fila ya no es legible. Se borra en vez de
     * dejarla, porque un enlace que no se puede descifrar solo sirve para que el
     * usuario vea "ya conectaste LALIGA" y no pueda entrar.
     */
    await borrarEnlace(credencial, identidad).catch(() => undefined);
    return null;
  }
}

/** Guarda (o reemplaza) el enlace. Reemplaza para poder reconectar sin borrar antes. */
export async function guardarEnlace(
  credencial: Credencial,
  identidad: string,
  tokens: TokenSet,
  email: string | null,
): Promise<void> {
  const respuesta = await pedir(credencial, `${TABLA}?on_conflict=id`, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({
      id: identidad,
      encrypted_tokens: encryptTokenSet(tokens),
      laliga_email: email,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`No se pudo guardar el enlace con LALIGA: HTTP ${respuesta.status}`);
  }
}

/** Renueva los tokens de un enlace ya existente, sin tocar el resto de la fila. */
export async function actualizarTokens(
  credencial: Credencial,
  identidad: string,
  tokens: TokenSet,
): Promise<void> {
  await pedir(credencial, `${TABLA}?id=eq.${encodeURIComponent(identidad)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      encrypted_tokens: encryptTokenSet(tokens),
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function borrarEnlace(credencial: Credencial, identidad: string): Promise<void> {
  await pedir(credencial, `${TABLA}?id=eq.${encodeURIComponent(identidad)}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });
}
