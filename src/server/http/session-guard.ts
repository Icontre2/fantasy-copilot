import { getValidAccessToken, readSessionId } from '@/src/server/laliga/session';
import { privateJson } from './responses';

/**
 * Resuelve el access token de la peticion. Si no hay sesion valida devuelve una
 * respuesta 401 ya construida; si la hay, devuelve el token.
 *
 * Toda ruta que hable con la liga privada empieza por aqui:
 *
 *   const auth = await requireSession(request);
 *   if ('response' in auth) return auth.response;
 */
export async function requireSession(
  request: Request,
): Promise<{ token: string } | { response: Response }> {
  const token = await getValidAccessToken(readSessionId(request));
  if (!token) {
    return {
      response: privateJson({ error: 'No has iniciado sesion en LALIGA Fantasy.', kind: 'unauthorized' }, 401),
    };
  }
  return { token };
}
