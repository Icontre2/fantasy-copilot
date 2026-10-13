import { claveDeEnlace, credencialAdmin, credencialDeUsuario, guardarEnlace } from './links.ts';
import { identidadDePeticion } from './identity.ts';
import type { TokenSet } from '../laliga/auth.ts';

/**
 * Si quien acaba de conectar LALIGA ya entró con Google o Facebook, deja la
 * cuenta enlazada: la próxima vez basta con «Continuar con Google».
 *
 * No lanza nunca: quien acaba de conectar entra, pase lo que pase con el
 * enlace. Lo peor que ocurre es que la próxima vez toque repetirlo.
 *
 * Se prefiere la credencial del propio usuario a la administrativa: hace lo
 * mismo y solo alcanza su fila. Se dice de quién es la clave incluso con la
 * suya, porque es lo que hace funcionar el respaldo administrativo; la base
 * rechaza pedir la de otro.
 */
export async function guardarEnlaceSiProcede(request: Request, tokens: TokenSet, email: string | null): Promise<boolean> {
  try {
    const quien = await identidadDePeticion(request);
    if (!quien) return false;
    const credencial = credencialDeUsuario(quien.accessToken) ?? credencialAdmin();
    if (!credencial) return false;
    const clave = await claveDeEnlace(credencial, quien.uuid);
    if (!clave) return false;
    await guardarEnlace(credencial, quien.identidad, tokens, email, clave);
    return true;
  } catch {
    return false;
  }
}
