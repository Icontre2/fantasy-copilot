/**
 * Las dos cookies del acceso con Google.
 *
 * `llf_intento` dura diez minutos y solo existe entre que te mandamos a Google y
 * que vuelves. `llf_user` es la larga: dice quien eres durante 30 dias.
 *
 * Las dos son `HttpOnly` —JavaScript del navegador no las puede leer— y
 * `SameSite=Lax`, que es lo que deja que la vuelta desde Google las mande. Con
 * `Strict` el navegador no las enviaria al volver y el login fallaria siempre.
 */

export const COOKIE_INTENTO = 'llf_intento';
export const COOKIE_USUARIO = 'llf_user';

/**
 * El motivo por el que fallo el acceso con Google.
 *
 * Va en cookie y no en la direccion (`/?error=...`) por dos razones. Una: la
 * direccion se queda ahi, asi que recargar volveria a enseñar un error que ya no
 * es cierto y compartir el enlace se llevaria el error puesto. Y dos: asi el
 * mensaje llega por la MISMA ruta que el resto de los datos de la pantalla, en
 * vez de por un camino aparte que hay que leer y limpiar a mano.
 *
 * Se borra en cuanto se lee: es de un solo uso.
 */
export const COOKIE_ERROR = 'llf_auth_error';

export const DIAS_30 = 30 * 24 * 60 * 60;
const MINUTOS_10 = 10 * 60;

function atributos(maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${maxAge}`;
}

export function cookieDeIntento(valor: string): string {
  return `${COOKIE_INTENTO}=${encodeURIComponent(valor)}; ${atributos(MINUTOS_10)}`;
}

/** Caduca el intento. Se usa siempre al volver: sirvio para una vez y ya. */
export function limpiarIntento(): string {
  return `${COOKIE_INTENTO}=; ${atributos(0)}`;
}

export function cookieDeUsuario(valor: string): string {
  return `${COOKIE_USUARIO}=${encodeURIComponent(valor)}; ${atributos(DIAS_30)}`;
}

export function limpiarUsuario(): string {
  return `${COOKIE_USUARIO}=; ${atributos(0)}`;
}

export function cookieDeError(mensaje: string): string {
  // Un minuto: lo que tarda el navegador en volver y pedir la sesion.
  return `${COOKIE_ERROR}=${encodeURIComponent(mensaje)}; ${atributos(60)}`;
}

export function limpiarError(): string {
  return `${COOKIE_ERROR}=; ${atributos(0)}`;
}

/** Lee una cookie por nombre. Devuelve `undefined` si no está. */
export function leerCookie(request: Request, nombre: string): string | undefined {
  const cabecera = request.headers.get('cookie');
  if (!cabecera) return undefined;
  for (const parte of cabecera.split(';')) {
    const [clave, ...resto] = parte.trim().split('=');
    if (clave === nombre) return decodeURIComponent(resto.join('='));
  }
  return undefined;
}
