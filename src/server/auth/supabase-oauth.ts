import { desafioDe, type IntentoDeLogin } from './pkce.ts';
import { activosDe, type Proveedor } from './providers.ts';

/**
 * Entrar con Google, Apple o Facebook, a traves de Supabase Auth.
 *
 * ── Por que Supabase y no hablar con cada proveedor ──────────────────────────
 * Google solo se puede hacer a mano sin mucho dolor. Apple no: exige que el
 * "secreto de cliente" sea un JWT firmado con ES256 que ademas CADUCA cada seis
 * meses, asi que hay que rotarlo o el acceso se cae solo un martes cualquiera.
 * Facebook trae lo suyo. Supabase ya mantiene las tres cosas.
 *
 * ── Que se usa exactamente ───────────────────────────────────────────────────
 * El flujo PKCE de Supabase, contra sus dos endpoints:
 *   - `/auth/v1/authorize` para mandar al usuario al proveedor.
 *   - `/auth/v1/token?grant_type=pkce` para canjear el codigo.
 *
 * Se llama por HTTP en vez de montar el cliente de Supabase en el navegador, y
 * es a proposito: en esta app TODA la logica vive en el servidor y la interfaz
 * solo habla con `/api/fantasy/*`. Meter un cliente de sesion en el navegador
 * abriria un segundo camino a la autenticacion, y dos caminos es justo lo que no
 * queremos.
 *
 * De la sesion de Supabase solo interesa QUIEN eres: su `user.id` y tu correo.
 * Ni el access token ni el refresh token de Supabase se guardan, porque esta app
 * no le pide nada mas a Supabase en tu nombre. Lo que se guarda es el enlace con
 * LALIGA, que es otra cosa (ver `links.ts`).
 */

/** Cuanto se recuerda que proveedores estan activos. */
const CACHE_MS = 5 * 60 * 1000;

export type ConfigSupabaseAuth = { url: string; apiKey: string; redirectUri: string };

/**
 * La configuracion, o `null` si falta.
 *
 * La clave es la PUBLICABLE (`anon`), no la de servicio. Es la que corresponde:
 * identificar a alguien no requiere permisos de administrador, y usar aqui la de
 * servicio seria darle a este flujo mas poder del que necesita.
 */
export function configAuth(): ConfigSupabaseAuth | null {
  const url = process.env.SUPABASE_URL?.trim();
  const apiKey = (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim();
  if (!url || !apiKey) return null;
  return { url: url.replace(/\/$/, ''), apiKey, redirectUri: redirectUri() };
}

/**
 * A donde vuelve el usuario. Tiene que estar en la lista de URLs permitidas del
 * panel de Supabase (Authentication -> URL Configuration -> Redirect URLs); si
 * no, Supabase manda a la portada del sitio y el codigo se pierde por el camino.
 */
export function redirectUri(): string {
  const explicito = process.env.APP_BASE_URL?.trim();
  const base =
    explicito ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000');
  return `${base.replace(/\/$/, '')}/api/fantasy/auth/social/callback`;
}

/** La URL a la que se manda al usuario para identificarse con ese proveedor. */
export function urlDeAutorizacion(
  config: ConfigSupabaseAuth,
  proveedor: Proveedor,
  intento: IntentoDeLogin,
): string {
  const parametros = new URLSearchParams({
    provider: proveedor,
    redirect_to: config.redirectUri,
    code_challenge: desafioDe(intento.verifier),
    code_challenge_method: 's256',
  });
  return `${config.url}/auth/v1/authorize?${parametros.toString()}`;
}

let cache: { at: number; proveedores: Proveedor[] } | null = null;

/**
 * Los proveedores encendidos en el panel de Supabase.
 *
 * Se pregunta en vez de suponerlo: asi encender uno nuevo en Supabase hace que
 * aparezca su boton sin tocar codigo, y nunca se enseña uno que no funcionaria.
 * Si la consulta falla se devuelve lista vacia — no se enseña nada — porque un
 * boton roto es peor que un boton que falta.
 */
export async function proveedoresActivos(config: ConfigSupabaseAuth): Promise<Proveedor[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.proveedores;
  try {
    const respuesta = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.apiKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!respuesta.ok) return [];
    const proveedores = activosDe(await respuesta.json());
    cache = { at: Date.now(), proveedores };
    return proveedores;
  } catch {
    return [];
  }
}

export type Identificado = { id: string; email: string | null };

/**
 * Canjea el codigo por la identidad de quien acaba de entrar.
 *
 * Devuelve el motivo en castellano en vez de lanzar, para que la ruta pueda
 * enseñarlo sin traducir excepciones.
 */
export async function canjearCodigo(
  config: ConfigSupabaseAuth,
  codigo: string,
  verifier: string,
): Promise<{ usuario: Identificado } | { error: string }> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${config.url}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_code: codigo, code_verifier: verifier }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { error: 'No se pudo contactar con el servicio de acceso.' };
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as
    | { user?: { id?: string; email?: string | null }; msg?: string; error_description?: string; error?: string }
    | null;

  if (!respuesta.ok || !cuerpo?.user?.id) {
    const detalle = cuerpo?.error_description ?? cuerpo?.msg ?? cuerpo?.error ?? `HTTP ${respuesta.status}`;
    return { error: `No se pudo completar el acceso: ${detalle}` };
  }

  return { usuario: { id: cuerpo.user.id, email: cuerpo.user.email ?? null } };
}
