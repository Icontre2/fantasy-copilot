import { leerCookie, COOKIE_USUARIO } from './cookies.ts';
import { firmar, verificar } from './identity-cookie.ts';

/**
 * Quien es el que hace esta peticion, si es que entro con Google.
 *
 * El secreto de firma sale del mismo sitio que el de cifrado de sesiones. Se lee
 * aqui y no en `identity-cookie.ts` para que aquello siga siendo puro y
 * testeable sin entorno.
 */

function secretoDeFirma(): string | null {
  const explicito = process.env.SESSION_ENCRYPTION_KEY?.trim();
  if (explicito) return explicito;
  const vercel = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (vercel) return vercel;
  /*
   * En local sin clave se usa una fija de desarrollo. No protege nada real —no
   * hay nada real que proteger en local— y evita que cada reinicio cierre la
   * sesion mientras se prueba el flujo.
   */
  return process.env.NODE_ENV === 'production' ? null : 'clave-de-desarrollo-solo-para-local-no-secreta';
}

/** La identidad firmada en la cookie, o `null` si no hay o no es de fiar. */
export function identidadDePeticion(request: Request): string | null {
  const secreto = secretoDeFirma();
  if (!secreto) return null;
  const cookie = leerCookie(request, COOKIE_USUARIO);
  if (!cookie) return null;
  return verificar(cookie, secreto);
}

/** El valor a poner en la cookie para esa identidad. `null` si no hay secreto. */
export function firmarIdentidad(identidad: string): string | null {
  const secreto = secretoDeFirma();
  return secreto ? firmar(identidad, secreto) : null;
}
