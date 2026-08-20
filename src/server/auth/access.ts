import { refreshTokens } from '@/src/server/laliga/auth';
import { getValidAccessToken, readSessionId } from '@/src/server/laliga/session';
import { actualizarTokens, claveDeEnlace, credencialAdmin, leerEnlace, uuidDeIdentidad } from './links.ts';
import { identidadDePeticion } from './identity.ts';

/**
 * El access token de LALIGA de esta peticion, venga de donde venga.
 *
 * Hay dos formas de estar dentro y las dos valen:
 *
 *   1. Entraste con email y contraseña de LALIGA. La cookie de sesion de
 *      siempre. Es la unica que existia antes y sigue funcionando igual.
 *   2. Entraste con Google y ya habias conectado tu cuenta de LALIGA. Entonces
 *      la cookie dice quien eres y los tokens salen de la tabla de enlaces.
 *
 * Se mira primero la sesion clasica porque es la que acabas de crear al conectar
 * LALIGA: si en esa peticion se prefiriera el enlace, se leeria una fila que
 * quiza aun no esta escrita.
 */
export async function accessTokenDe(request: Request): Promise<string | null> {
  const clasico = await getValidAccessToken(readSessionId(request));
  if (clasico) return clasico;

  /*
   * Aqui NO hay JWT del usuario: esto es una llamada normal de la app, no la
   * vuelta desde Google. Asi que este atajo solo existe con clave
   * administrativa. Sin ella no se pierde nada: al volver del proveedor se crea
   * una sesion de LALIGA de las de siempre, y esa es la que responde arriba.
   */
  const identidad = identidadDePeticion(request);
  const credencial = credencialAdmin();
  if (!identidad || !credencial) return null;

  const quien = uuidDeIdentidad(identidad);
  if (!quien) return null;
  const clave = await claveDeEnlace(credencial, quien);
  if (!clave) return null;

  const enlace = await leerEnlace(credencial, identidad, clave);
  if (!enlace) return null;

  if (Date.now() < enlace.tokens.expiresAt) return enlace.tokens.accessToken;

  /*
   * Caducado: se renueva y se guarda. Si LALIGA rechaza el refresh, el enlace ya
   * no sirve — pero NO se borra: que haya que reconectar es una cosa y perder el
   * enlace entero es otra, y el usuario prefiere que le digan "reconecta" a que
   * la app finja que nunca conecto nada.
   */
  try {
    const frescos = await refreshTokens(enlace.tokens.refreshToken);
    await actualizarTokens(credencial, identidad, frescos, clave);
    return frescos.accessToken;
  } catch {
    return null;
  }
}
