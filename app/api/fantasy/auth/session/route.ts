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
   * Qué proveedores puede enseñar la pantalla, y si ya te has identificado con
   * alguno. `proveedores` sale de preguntarle a Supabase cuáles tiene
   * encendidos: así activar uno en su panel hace que aparezca su botón sin
   * tocar código, y nunca se enseña uno que no funcionaría.
   *
   * `identificado` significa «sé quién eres, pero aún no me has dicho cuál es
   * tu cuenta de LALIGA», que es el paso intermedio del flujo.
   */
  const config = configAuth();
  const proveedores = config && hayAlmacenDeEnlaces() ? await proveedoresActivos(config) : [];
  const social = {
    proveedores,
    identificado: identidadDePeticion(request) !== null,
    /*
     * POR QUÉ no hay botones, cuando no los hay.
     *
     * Sin esto la pantalla de acceso simplemente no enseñaba nada: ni botones
     * ni explicación. Quien monta el despliegue se queda mirando un hueco sin
     * saber si falta una variable, si falta encender el proveedor en Supabase o
     * si es que la app no lo lleva. Son tres cosas distintas y se arreglan en
     * sitios distintos.
     *
     * Dice QUÉ falta, nunca un valor: que `SUPABASE_URL` esté o no puesta no es
     * un secreto; su contenido sí. Es el mismo criterio que ya sigue el
     * diagnóstico de sesión de aquí al lado.
     */
    motivo: motivoSinProveedores(config !== null, hayAlmacenDeEnlaces(), proveedores.length),
  };

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
    if (!token) return responder({ authenticated: false, session, social, authError });
    return responder({ authenticated: true, manager: await getMyProfile(token), session, social, authError });
  } catch (error) {
    return errorJson(error);
  }
}

/**
 * Qué le falta a este despliegue para poder ofrecer Google, Apple o Facebook.
 *
 * `null` cuando no falta nada: entonces los botones están ahí y no hay nada que
 * explicar. El orden importa — se nombra el PRIMER paso que falta, no todos a
 * la vez, porque hasta que no está ese no se puede comprobar el siguiente.
 */
function motivoSinProveedores(hayConfig: boolean, hayEnlaces: boolean, activos: number): string | null {
  if (!hayConfig) {
    return "Faltan SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en las variables de entorno del despliegue.";
  }
  if (!hayEnlaces) {
    return "Falta SUPABASE_SERVICE_ROLE_KEY: sin base de datos no hay dónde recordar qué cuenta de LALIGA es la tuya, y entrar con Google te dejaría igual.";
  }
  if (activos === 0) {
    return "Ninguno está encendido en Supabase → Authentication → Providers. Al activar uno, su botón aparece aquí solo, sin desplegar nada.";
  }
  return null;
}
