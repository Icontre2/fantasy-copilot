import {
  leerCookie,
  COOKIE_USUARIO,
  COOKIE_USUARIO_REFRESCO,
  cookieDeUsuario,
  cookieDeRefrescoDeUsuario,
  limpiarRefrescoDeUsuario,
} from './cookies.ts';
import { configAuth, refrescarUsuario, usuarioDeToken } from './supabase-oauth.ts';
import { identidadDeUsuario } from './links.ts';

/**
 * Quien es el que hace esta peticion, si es que entro con Google.
 *
 * ── Lo que habia antes, y por que no funcionaba ─────────────────────────────
 * La cookie llevaba la identidad FIRMADA POR NOSOTROS con una clave del
 * servidor. En un despliegue con clave, bien. Sin ella —que es el caso real—
 * `firmarIdentidad` devolvia `null`, la cookie no se ponia, y la app no volvia a
 * saber quien eras. Consecuencias, todas invisibles desde fuera:
 *
 *   - `social.identificado` era siempre `false`, asi que la pantalla nunca
 *     llegaba a decir «ya te has identificado, ahora conecta LALIGA».
 *   - Al conectar LALIGA con la contraseña no habia forma de saber a quien
 *     asociar el enlace, asi que no se guardaba. Habia que ir a un menu a
 *     enlazar a mano, cosa que nadie iba a descubrir.
 *
 * ── Lo que lleva ahora ──────────────────────────────────────────────────────
 * El access token de Supabase, tal cual, en una cookie `httpOnly`. No hace falta
 * ninguna clave nuestra: lo firma Supabase, y a Supabase se le pregunta si vale.
 * Que la cookie sea `httpOnly` impide que lo lea JavaScript del navegador, pero
 * no que alguien fabrique la peticion a mano — por eso SIEMPRE se verifica, y
 * nunca se cree lo que dice la cookie por si misma.
 *
 * Dura una hora, que es lo que dura el token. Es de sobra para lo que tiene que
 * cubrir: entrar con Google y, acto seguido, conectar LALIGA.
 */

export type Identidad = {
  /** `supabase:<uuid>`, la forma que espera la tabla de enlaces. */
  identidad: string;
  /** El `uuid` a secas, que es lo que entiende la base al derivar la clave. */
  uuid: string;
  /** El token con el que hablar con la base EN NOMBRE de esta persona. */
  accessToken: string;
  email: string | null;
};

/** Quien hace esta peticion, verificado contra Supabase. `null` si nadie. */
export async function identidadDePeticion(request: Request): Promise<Identidad | null> {
  const token = leerCookie(request, COOKIE_USUARIO);
  if (!token) return null;

  const config = configAuth();
  if (!config) return null;

  const usuario = await usuarioDeToken(config, token);
  if (!usuario) return null;

  return {
    identidad: identidadDeUsuario(usuario.id),
    uuid: usuario.id,
    accessToken: token,
    email: usuario.email,
  };
}

/**
 * Lo mismo, pero renovando con el refresh token cuando el access token ya no
 * vale — y devolviendo las cookies que hay que fijar para no repetir la
 * renovación en cada petición.
 *
 * ── Por qué es una función aparte ───────────────────────────────────────────
 * `identidadDePeticion` la usan rutas del producto que no esperan tener que
 * devolver cookies. En vez de cambiarlas todas —y arriesgar el acceso social,
 * que ya costó bastante arreglar— esta variante es aditiva: solo la usa el
 * panel de marketing, que es donde la hora de vida de la identidad hacía daño
 * de verdad (te echaba entre una revisión y la siguiente).
 *
 * Supabase ROTA el refresh token al renovar: el nuevo se devuelve en las
 * cookies para que quien llame lo guarde. No hacerlo deja el token gastado y
 * la próxima renovación falla — el mismo fallo que tuvo el enlace con LALIGA.
 */
export type IdentidadRenovada = { identidad: Identidad | null; cookies: string[] };

export async function identidadDePeticionConRefresco(request: Request): Promise<IdentidadRenovada> {
  const config = configAuth();
  if (!config) return { identidad: null, cookies: [] };

  const token = leerCookie(request, COOKIE_USUARIO);
  if (token) {
    const usuario = await usuarioDeToken(config, token);
    if (usuario) {
      return {
        identidad: { identidad: identidadDeUsuario(usuario.id), uuid: usuario.id, accessToken: token, email: usuario.email },
        cookies: [],
      };
    }
  }

  // El access token falta o ya no vale: se intenta con el refresh token.
  const refresco = leerCookie(request, COOKIE_USUARIO_REFRESCO);
  if (!refresco) return { identidad: null, cookies: [] };

  const renovado = await refrescarUsuario(config, refresco);
  if (!renovado) {
    // El refresh token tampoco sirve (caducado o ya gastado): se limpia para
    // no reintentar en cada carga contra un token muerto.
    return { identidad: null, cookies: [limpiarRefrescoDeUsuario()] };
  }

  const cookies = [cookieDeUsuario(renovado.accessToken)];
  if (renovado.refreshToken) cookies.push(cookieDeRefrescoDeUsuario(renovado.refreshToken));

  return {
    identidad: {
      identidad: identidadDeUsuario(renovado.usuario.id),
      uuid: renovado.usuario.id,
      accessToken: renovado.accessToken,
      email: renovado.usuario.email,
    },
    cookies,
  };
}
