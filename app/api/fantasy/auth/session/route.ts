import { errorJson, privateJson, privateJsonWithCookies } from "@/src/server/http/responses";
import { COOKIE_ERROR, leerCookie, limpiarError } from "@/src/server/auth/cookies";
import { getMyProfile } from "@/src/server/laliga/read";
import { diagnosticoDeSesion } from "@/src/server/laliga/session";
import { accessTokenDe } from "@/src/server/auth/access";
import { identidadDePeticion } from "@/src/server/auth/identity";
import { configGoogle } from "@/src/server/auth/google";
import { hayAlmacenDeEnlaces } from "@/src/server/auth/links";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/auth/session — quien esta conectado, si es que hay alguien.
 *
 * Va acompañado del diagnostico de cuanto dura la sesion. Se manda tambien
 * cuando NO hay nadie conectado, y a proposito: el momento en que a alguien le
 * interesa saber por que le echan es justo cuando esta viendo el login otra vez.
 *
 * No expone ningun secreto: solo si cada variable de entorno esta puesta.
 */
export async function GET(request: Request) {
  const session = diagnosticoDeSesion();
  /*
   * `google` describe el estado del acceso con proveedor, y tiene tres valores
   * que la pantalla necesita distinguir:
   *   - `disponible`: se puede ofrecer el botón.
   *   - `identificado`: entraste con Google pero aún no has conectado LALIGA,
   *     así que toca pedir la contraseña UNA vez.
   * Sin esto la pantalla no sabría si enseñar el botón, el formulario, o ambos.
   */
  const google = {
    disponible: configGoogle() !== null && hayAlmacenDeEnlaces(),
    identificado: identidadDePeticion(request) !== null,
  };

  /*
   * Si el acceso con Google acaba de fallar, el motivo viene en una cookie de un
   * solo uso. Se lee y se borra en la misma respuesta: recargar no debe volver a
   * enseñar un error que ya pasó.
   */
  const authError = leerCookie(request, COOKIE_ERROR) ?? null;

  // La cookie se borra en TODAS las salidas, incluida la de error: si solo se
  // borrara en la buena, un fallo de LALIGA dejaría el aviso de Google pegado.
  const responder = (cuerpo: Record<string, unknown>) =>
    authError ? privateJsonWithCookies(cuerpo, limpiarError()) : privateJson(cuerpo);

  try {
    const token = await accessTokenDe(request);
    if (!token) return responder({ authenticated: false, session, google, authError });
    return responder({ authenticated: true, manager: await getMyProfile(token), session, google, authError });
  } catch (error) {
    return errorJson(error);
  }
}
