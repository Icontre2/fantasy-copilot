import { createHash } from 'node:crypto';
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
 * De la sesion de Supabase interesan dos cosas: QUIEN eres (`user.id` y correo) y
 * el JWT del usuario, que se usa una sola vez —dentro de la propia peticion de
 * vuelta— para leer o escribir TU fila de enlaces con las reglas de la tabla
 * puestas. Ni ese token ni el de refresco se guardan en ningun sitio ni llegan al
 * navegador. Lo que si se guarda es el enlace con LALIGA, que es otra cosa (ver
 * `links.ts`).
 */

/** Cuanto se recuerda que proveedores estan activos. */
const CACHE_MS = 5 * 60 * 1000;

/**
 * La URL y la publishable key NO son secretos: Supabase las diseña para poder
 * vivir en clientes web y repositorios públicos. Las variables de entorno siguen
 * teniendo prioridad para que previews/otros despliegues puedan apuntar a otro
 * proyecto, pero producción ya no queda inutilizada si Vercel no las inyecta.
 */
const SUPABASE_URL_PUBLICA = 'https://ggqealkrogfgbykicmfo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY_PUBLICA = 'sb_publishable_BqPIfs-29PVz6UdF9e9z7Q_kik1zcol';

export type ConfigSupabaseAuth = { url: string; apiKey: string; redirectUri: string };

/**
 * La configuracion, o `null` si falta.
 *
 * La clave es la PUBLICABLE (`anon`), no la de servicio. Es la que corresponde:
 * identificar a alguien no requiere permisos de administrador, y usar aqui la de
 * servicio seria darle a este flujo mas poder del que necesita.
 */
export function configAuth(): ConfigSupabaseAuth | null {
  const url = process.env.SUPABASE_URL?.trim() || SUPABASE_URL_PUBLICA;
  const apiKey =
    (process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY)?.trim() ||
    SUPABASE_PUBLISHABLE_KEY_PUBLICA;
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

/**
 * Quien hay detras de un token de Supabase, preguntandoselo a Supabase.
 *
 * ── Por que existe ──────────────────────────────────────────────────────────
 * La cookie que dice «quien eres» se firmaba con una clave del servidor. Sin esa
 * clave —que es el caso real del despliegue— no se firmaba nada, la cookie no se
 * ponia, y la app no volvia a saber quien eras nunca. De ahi que hubiera que ir
 * a un menu escondido a enlazar la cuenta a mano.
 *
 * Un token de Supabase no necesita ninguna clave nuestra: lo firma Supabase y
 * Supabase dice si vale. Ademas responde a la pregunta correcta —«¿sigue siendo
 * valido AHORA?»— y no solo «¿lo firmamos nosotros alguna vez?».
 *
 * Se cachea un par de minutos porque esto se consulta en cada carga de la app y
 * el token no cambia de dueño entre dos peticiones seguidas. La clave del cache
 * es un hash del token: el token en si no se queda en memoria.
 */
const VALIDEZ_DE_CACHE_MS = 2 * 60 * 1000;
const usuariosVistos = ((globalThis as { __llfUsuarios?: Map<string, { visto: number; usuario: Identificado | null }> })
  .__llfUsuarios ??= new Map());

export async function usuarioDeToken(
  config: ConfigSupabaseAuth,
  accessToken: string,
): Promise<Identificado | null> {
  const huella = createHash('sha256').update(accessToken).digest('base64url');
  const cacheado = usuariosVistos.get(huella);
  if (cacheado && Date.now() - cacheado.visto < VALIDEZ_DE_CACHE_MS) return cacheado.usuario;

  let usuario: Identificado | null = null;
  try {
    const respuesta = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.apiKey, Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (respuesta.ok) {
      const cuerpo = (await respuesta.json().catch(() => null)) as
        | { id?: string; email?: string | null }
        | null;
      if (cuerpo?.id) usuario = { id: cuerpo.id, email: cuerpo.email ?? null };
    }
  } catch {
    /*
     * Un fallo de red NO se cachea: si se guardara `null`, un corte de dos
     * segundos dejaria al usuario sin identidad durante los dos minutos
     * siguientes.
     */
    return null;
  }

  usuariosVistos.set(huella, { visto: Date.now(), usuario });
  if (usuariosVistos.size > 500) {
    // Poda simple: esto es un cache, no un almacen.
    for (const [clave, valor] of usuariosVistos) {
      if (Date.now() - valor.visto > VALIDEZ_DE_CACHE_MS) usuariosVistos.delete(clave);
    }
  }
  return usuario;
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
 * Lo que se saca del canje: quien eres y el token con el que Supabase te
 * reconoce.
 *
 * El `accessToken` es el JWT del USUARIO, no una clave de administrador. Sirve
 * para una sola cosa y dura una hora: hablar con la base de datos EN SU NOMBRE,
 * de modo que las reglas de la tabla (RLS) le dejen tocar su fila y ninguna otra.
 * Es lo que permite recordar el enlace con LALIGA sin `service_role`.
 *
 * No se guarda en ningun sitio ni viaja al navegador: se usa dentro de la misma
 * peticion en la que se obtiene y se descarta con ella.
 */
export type Canje = { usuario: Identificado; accessToken: string; refreshToken: string | null };

/**
 * Renueva la identidad con el refresh token de Supabase.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 * El access token de Supabase dura UNA HORA. La cookie de identidad lo lleva
 * tal cual, así que sin esto la app deja de saber quién eres a la hora de
 * haber entrado con Google. Para el flujo del producto («entra con Google y
 * acto seguido conecta LALIGA») no se notaba: son dos minutos. Para el panel
 * de marketing, que se abre a diario para revisar, significaba volver a hacer
 * el login social CADA VEZ.
 *
 * Supabase rota el refresh token en cada renovación —el que devuelve no es el
 * que se le mandó—, así que quien llame tiene que guardar el nuevo. Es el
 * mismo fallo que tuvo el enlace con LALIGA: renovar y no guardar deja el
 * token gastado y la siguiente vez ya no funciona.
 */
export async function refrescarUsuario(
  config: ConfigSupabaseAuth,
  refreshToken: string,
): Promise<Canje | null> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }

  if (!respuesta.ok) return null;
  const cuerpo = (await respuesta.json().catch(() => null)) as
    | { user?: { id?: string; email?: string | null }; access_token?: string; refresh_token?: string }
    | null;

  if (!cuerpo?.user?.id || !cuerpo.access_token) return null;
  return {
    usuario: { id: cuerpo.user.id, email: cuerpo.user.email ?? null },
    accessToken: cuerpo.access_token,
    refreshToken: cuerpo.refresh_token ?? null,
  };
}

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
): Promise<{ canje: Canje } | { error: string }> {
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
    | {
        user?: { id?: string; email?: string | null };
        access_token?: string;
        refresh_token?: string;
        msg?: string;
        error_description?: string;
        error?: string;
      }
    | null;

  if (!respuesta.ok || !cuerpo?.user?.id || !cuerpo.access_token) {
    const detalle = cuerpo?.error_description ?? cuerpo?.msg ?? cuerpo?.error ?? `HTTP ${respuesta.status}`;
    return { error: `No se pudo completar el acceso: ${detalle}` };
  }

  return {
    canje: {
      usuario: { id: cuerpo.user.id, email: cuerpo.user.email ?? null },
      accessToken: cuerpo.access_token,
      refreshToken: cuerpo.refresh_token ?? null,
    },
  };
}
