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
 * Con que se cifra el enlace de esta persona.
 *
 * ── Por que no basta con `SESSION_ENCRYPTION_KEY` ────────────────────────────
 * Hace falta una clave que NO cambie entre despliegues: si cambia, la fila queda
 * ilegible y el usuario ve "ya conectaste LALIGA" sin poder entrar, que es peor
 * que no haber guardado nada. La variable de Vercel sirve, pero si no esta
 * puesta la alternativa era no guardar NADA, y entonces "entrar con Google" no
 * ahorra nada a nadie. Es donde se quedaba atascado esto.
 *
 * Asi que la base de datos deriva una clave por persona a partir de una raiz que
 * solo ella conoce (`clave_de_enlace()`). Es estable, distinta para cada uno, y
 * solo la puede pedir quien ya ha entrado — y solo la suya.
 *
 * Y cuando ADEMAS hay `SESSION_ENCRYPTION_KEY`, se usan las dos: para descifrar
 * una fila haria falta a la vez una copia de la base y la variable de Vercel.
 * Cada mitad por su lado no sirve de nada.
 *
 * `null` si no hay forma de obtener clave. Entonces no se guarda nada, a
 * proposito: guardar un token de LALIGA sin cifrar no es una opcion.
 */
export async function claveDeEnlace(credencial: Credencial, deQuien?: string): Promise<string | null> {
  const derivada = await raizDerivada(credencial, deQuien);
  if (!derivada) return null;
  const explicita = process.env.SESSION_ENCRYPTION_KEY?.trim();
  return explicita ? `${explicita}:${derivada}` : derivada;
}

/**
 * `deQuien` solo hace falta en el camino administrativo, donde no hay usuario
 * delante. La base lo rechaza si lo manda cualquier otro, asi que no es una
 * puerta: es el mismo permiso que ya tiene `service_role` para leer la tabla.
 */
async function raizDerivada(credencial: Credencial, deQuien?: string): Promise<string | null> {
  try {
    const respuesta = await pedir(credencial, 'rpc/clave_de_enlace', {
      method: 'POST',
      body: JSON.stringify(deQuien ? { quien: deQuien } : {}),
    });
    if (!respuesta.ok) return null;
    const valor = (await respuesta.json().catch(() => null)) as unknown;
    return typeof valor === 'string' && valor.length >= 32 ? valor : null;
  } catch {
    return null;
  }
}

/** El `uuid` que hay detras de una identidad `supabase:…`, o `null`. */
export function uuidDeIdentidad(identidad: string): string | null {
  if (!identidad.startsWith(PREFIJO_SUPABASE)) return null;
  const resto = identidad.slice(PREFIJO_SUPABASE.length);
  return /^[0-9a-f-]{36}$/i.test(resto) ? resto : null;
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
export async function leerEnlace(
  credencial: Credencial,
  identidad: string,
  clave: string,
): Promise<Enlace | null> {
  const respuesta = await pedir(
    credencial,
    `${TABLA}?id=eq.${encodeURIComponent(identidad)}&select=encrypted_tokens,laliga_email&limit=1`,
  );
  if (!respuesta.ok) return null;

  const filas = (await respuesta.json().catch(() => null)) as Fila[] | null;
  const fila = filas?.[0];
  if (!fila) return null;

  try {
    return { tokens: decryptTokenSet(fila.encrypted_tokens, clave), email: fila.laliga_email };
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
  clave: string,
): Promise<void> {
  const respuesta = await pedir(credencial, `${TABLA}?on_conflict=id`, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({
      id: identidad,
      encrypted_tokens: encryptTokenSet(tokens, clave),
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
  clave: string,
): Promise<void> {
  await pedir(credencial, `${TABLA}?id=eq.${encodeURIComponent(identidad)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({
      encrypted_tokens: encryptTokenSet(tokens, clave),
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
