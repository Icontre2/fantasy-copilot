import { errorJson, privateJson, privateJsonWithCookies } from "@/src/server/http/responses";
import { COOKIE_ERROR, leerCookie, limpiarError } from "@/src/server/auth/cookies";
import { getMyProfile } from "@/src/server/laliga/read";
import { diagnosticoDeSesion } from "@/src/server/laliga/session";
import { accessTokenDe } from "@/src/server/auth/access";
import { identidadDePeticion } from "@/src/server/auth/identity";
import { configAuth, proveedoresActivos } from "@/src/server/auth/supabase-oauth";
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
   * Si el acceso con Google acaba de fallar, el motivo viene en una cookie de un
   * solo uso. Se lee y se borra en la misma respuesta: recargar no debe volver a
   * enseñar un error que ya pasó.
   */
  const authError = leerCookie(request, COOKIE_ERROR) ?? null;

  // La cookie se borra en TODAS las salidas, incluida la de error: si solo se
  // borrara en la buena, un fallo de LALIGA dejaría el aviso del proveedor
  // pegado a la pantalla para siempre.
  const responder = (cuerpo: Record<string, unknown>) =>
    authError ? privateJsonWithCookies(cuerpo, limpiarError()) : privateJson(cuerpo);

  try {
    const token = await accessTokenDe(request);
    if (token) {
      const manager = await getMyProfile(token);
      return responder({ authenticated: true, manager, session, authError });
    }

    /*
     * Qué proveedores puede enseñar la pantalla, y si ya te has identificado con
     * alguno. `proveedores` sale de preguntarle a Supabase cuáles tiene
     * encendidos: así activar uno en su panel hace que aparezca su botón sin
     * tocar código, y nunca se enseña uno que no funcionaría.
     *
     * Solo hace falta cuando SÍ se va a enseñar el login: si ya hay sesión,
     * la pantalla ni la usa, así que no vale la pena preguntarle a Supabase.
     *
     * `identificado` significa «sé quién eres, pero aún no me has dicho cuál es
     * tu cuenta de LALIGA», que es el paso intermedio del flujo.
     */
    const config = configAuth();
    const social = {
      proveedores: config && hayAlmacenDeEnlaces() ? await proveedoresActivos(config) : [],
      identificado: identidadDePeticion(request) !== null,
    };
    return responder({ authenticated: false, session, social, authError });
  } catch (error) {
    return errorJson(error);
  }
}
