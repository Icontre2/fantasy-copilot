import { refreshTokens, type TokenSet } from '@/src/server/laliga/auth';
import { getValidAccessToken, readSessionId } from '@/src/server/laliga/session';
import { actualizarTokensSiCoincide, hayAlmacenDeEnlaces, leerEnlace } from './links.ts';
import { identidadDePeticion } from './identity.ts';

/**
 * Refrescos de enlace en vuelo, para no lanzar dos a la vez sobre la misma
 * identidad (mismo patron que `inflight` en `laliga/session.ts`).
 */
const inflight = ((globalThis as { __llfLinkRefreshes?: Map<string, Promise<string | null>> })
  .__llfLinkRefreshes ??= new Map<string, Promise<string | null>>());

function refreshEnlace(identidad: string, previousEncrypted: string, tokens: TokenSet): Promise<string | null> {
  const active = inflight.get(identidad);
  if (active) return active;

  const task = (async () => {
    try {
      const frescos = await refreshTokens(tokens.refreshToken);
      if (await actualizarTokensSiCoincide(identidad, previousEncrypted, frescos)) {
        return frescos.accessToken;
      }
      // Otra peticion concurrente ya escribio su propio refresh: se usa ese.
      const actual = await leerEnlace(identidad);
      return actual?.tokens.accessToken ?? null;
    } catch {
      return null;
    }
  })().finally(() => inflight.delete(identidad));

  inflight.set(identidad, task);
  return task;
}

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

  const identidad = identidadDePeticion(request);
  if (!identidad || !hayAlmacenDeEnlaces()) return null;

  const enlace = await leerEnlace(identidad);
  if (!enlace) return null;

  if (Date.now() < enlace.tokens.expiresAt) return enlace.tokens.accessToken;

  /*
   * Caducado: se renueva y se guarda. Si LALIGA rechaza el refresh, el enlace ya
   * no sirve — pero NO se borra: que haya que reconectar es una cosa y perder el
   * enlace entero es otra, y el usuario prefiere que le digan "reconecta" a que
   * la app finja que nunca conecto nada.
   */
  return refreshEnlace(identidad, enlace.encryptedTokens, enlace.tokens);
}

/** Si esta persona ya conectó LALIGA, con qué correo. `null` si no. */
export async function enlaceDe(request: Request): Promise<{ identidad: string; email: string | null } | null> {
  const identidad = identidadDePeticion(request);
  if (!identidad || !hayAlmacenDeEnlaces()) return null;
  const enlace = await leerEnlace(identidad);
  return enlace ? { identidad, email: enlace.email } : null;
}
