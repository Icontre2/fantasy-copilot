// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { privateJson } from '../http/responses.ts';
import { accesoDeMarketing } from './access.ts';
import { credencialDeMarketing } from './store.ts';
import { TransicionInvalida } from './actions.ts';
import type { Credencial } from '../auth/links.ts';

/**
 * Lo que repite cada ruta de `/api/marketing/**`: comprobar quién es, y con
 * qué credencial hablar con Supabase en su nombre.
 *
 * Ninguna ruta se fía de que el cliente ya pasó por `/api/marketing/auth` —
 * eso es solo la puerta que ve la interfaz. La comprobación de verdad ocurre
 * aquí, en el servidor, en CADA petición: es la única forma de que la RLS de
 * la migración y el guardia de la API digan siempre lo mismo.
 */
export type PeticionAutorizada = { email: string; credencial: Credencial };

export async function autorizar(request: Request): Promise<PeticionAutorizada | Response> {
  const acceso = await accesoDeMarketing(request);
  if (!acceso.autorizado) {
    // 401 si no sabemos quién es (no ha entrado con Google/Facebook); 403 si
    // sabemos quién es y no está en la lista. Ninguno de los dos dice más de
    // lo necesario sobre quién sí está autorizado.
    return privateJson({ error: 'No autorizado.' }, acceso.email ? 403 : 401);
  }

  const credencial = credencialDeMarketing(acceso.accessToken);
  if (!credencial) {
    return privateJson({ error: 'La configuración pública de Supabase no está disponible en este despliegue.' }, 503);
  }

  return { email: acceso.email, credencial };
}

/** `true` si lo que devolvió `autorizar` ya es una `Response` de error. */
export function esRespuestaDeError(valor: PeticionAutorizada | Response): valor is Response {
  return valor instanceof Response;
}

/**
 * Traduce los fallos esperados del servicio (`TransicionInvalida`, del
 * estado, y cualquier otro) a una respuesta HTTP. Un `TransicionInvalida` es
 * un rechazo de negocio, no un fallo de programa: 400, con el motivo en
 * español que ya trae el error. Todo lo demás es inesperado y se registra.
 */
export function errorDeMarketing(error: unknown): Response {
  if (error instanceof TransicionInvalida) {
    return privateJson({ error: error.message }, 400);
  }
  console.error('[marketing] error no controlado:', error);
  return privateJson({ error: 'Ha ocurrido un error inesperado.' }, 500);
}
