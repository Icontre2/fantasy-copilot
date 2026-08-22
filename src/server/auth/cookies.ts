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
 * El refresh token de Supabase, para poder renovar `llf_user` cuando caduque
 * sin obligar a repetir el login social. Ver `identity.ts`.
 */
export const COOKIE_USUARIO_REFRESCO = 'llf_user_refresh';

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

/**
 * La otra mitad: lo que ha SALIDO BIEN al volver del proveedor.
 *
 * Hace falta porque enlazar la cuenta no cambia nada en pantalla —ya estabas
 * dentro— y sin una linea que lo diga, el usuario no tiene forma de saber si ha
 * funcionado. Mismo mecanismo de un solo uso que el error, y por las mismas
 * razones.
 */
export const COOKIE_AVISO = 'llf_auth_aviso';

export const DIAS_30 = 30 * 24 * 60 * 60;
const MINUTOS_10 = 10 * 60;

/**
 * Lo que dura la cookie de identidad: lo mismo que el token que lleva dentro.
 *
 * Antes eran 30 dias, porque lo que llevaba era una afirmacion firmada por
 * nosotros que no caducaba. Ahora lleva el token de Supabase, que dura una hora;
 * guardarlo mas tiempo solo serviria para tener una cookie muerta en el
 * navegador y una llamada de verificacion tirada a la basura en cada carga.
 */
const UNA_HORA = 60 * 60;

/**
 * Lo que dura el refresh token de Supabase en el navegador.
 *
 * Aquí SÍ tiene sentido guardar 30 días, al revés que con el access token: el
 * refresh token no caduca a la hora, y es lo único que permite volver a saber
 * quién eres sin repetir el login social. Sin él, el panel de marketing te
 * echaba cada hora.
 */
const TREINTA_DIAS = 30 * 24 * 60 * 60;

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
  return `${COOKIE_USUARIO}=${encodeURIComponent(valor)}; ${atributos(UNA_HORA)}`;
}

export function cookieDeRefrescoDeUsuario(valor: string): string {
  return `${COOKIE_USUARIO_REFRESCO}=${encodeURIComponent(valor)}; ${atributos(TREINTA_DIAS)}`;
}

export function limpiarRefrescoDeUsuario(): string {
  return `${COOKIE_USUARIO_REFRESCO}=; ${atributos(0)}`;
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

export function cookieDeAviso(mensaje: string): string {
  return `${COOKIE_AVISO}=${encodeURIComponent(mensaje)}; ${atributos(60)}`;
}

export function limpiarAviso(): string {
  return `${COOKIE_AVISO}=; ${atributos(0)}`;
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
