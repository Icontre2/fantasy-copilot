import { errorJson, privateJson, privateJsonWithCookies } from "@/src/server/http/responses";
import { COOKIE_ERROR, leerCookie, limpiarError } from "@/src/server/auth/cookies";
import { getMyProfile } from "@/src/server/laliga/read";
import { buildSessionCookies, diagnosticoDeSesion, readSessionId, renovarSesionDeCookie } from "@/src/server/laliga/session";
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
   * IMPORTANTE: detectar e iniciar un proveedor NO necesita service_role. La
   * clave administrativa solo sirve para recordar de forma persistente el
   * enlace con LALIGA. Bloquear aquí los proveedores por no tenerla impedía
   * incluso comprobar si Google/Apple/Facebook estaban bien configurados.
   *
   * `identificado` significa «sé quién eres, pero aún no me has dicho cuál es
   * tu cuenta de LALIGA», que es el paso intermedio del flujo.
   */
  const config = configAuth();
  const hayEnlaces = hayAlmacenDeEnlaces();
  const proveedores = config ? await proveedoresActivos(config) : [];
  const social = {
    proveedores,
    identificado: identidadDePeticion(request) !== null,
    motivo: motivoSinProveedores(config !== null, hayEnlaces, proveedores.length),
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
  /*
   * Cookies que hay que devolver SI O SI cuando se ha renovado la sesion: en
   * modo cookie la sesion renovada vive en la propia cookie, asi que no
   * escribirla seria gastar un refresh token para nada.
   */
  const galletas: string[] = [];
  const responder = (cuerpo: Record<string, unknown>) => {
    const todas = [...galletas, ...(authError ? limpiarError() : [])];
    return todas.length > 0 ? privateJsonWithCookies(cuerpo, todas) : privateJson(cuerpo);
  };

  try {
    let token = await accessTokenDe(request);

    /*
     * Aqui es donde la sesion deja de morirse cada 24 horas.
     *
     * Esta ruta la llama la app en CADA carga, asi que es el sitio natural para
     * renovar: si al token le queda poco —o ya ha caducado, pero el refresh
     * token sigue vivo— se pide uno nuevo y se reescribe la cookie. Con la app
     * abriendose a diario, la sesion no se acaba nunca.
     *
     * Se intenta tambien cuando `token` es null: un access token caducado no
     * invalida el refresh token, que es justo el caso de «vuelvo al dia
     * siguiente». Antes ahi se enseñaba la pantalla de acceso sin necesidad.
     */
    const renovada = await renovarSesionDeCookie(readSessionId(request));
    if (renovada) {
      token = renovada.accessToken;
      galletas.push(...buildSessionCookies(renovada.sesion));
    }

    if (!token) return responder({ authenticated: false, session, social, authError });
    return responder({ authenticated: true, manager: await getMyProfile(token), session, social, authError });
  } catch (error) {
    return errorJson(error);
  }
}

/**
 * Qué le falta a este despliegue para poder ofrecer Google, Apple o Facebook.
 *
 * `null` cuando los botones pueden ofrecerse. La falta de almacenamiento de
 * enlaces no bloquea la identidad social: solo significa que, después, el
 * usuario tendrá que conectar LALIGA y ese vínculo no sobrevivirá como acceso
 * social automático hasta configurar almacenamiento persistente.
 */
function motivoSinProveedores(hayConfig: boolean, hayEnlaces: boolean, activos: number): string | null {
  if (!hayConfig) {
    return "Falta la configuración pública de Supabase para consultar los proveedores sociales.";
  }
  if (activos === 0) {
    return "Ninguno está encendido en Supabase → Authentication → Providers. Al activar uno, su botón aparece aquí solo, sin desplegar nada.";
  }
  if (!hayEnlaces) {
    return "Google, Apple y Facebook pueden identificarte, pero falta almacenamiento persistente para recordar automáticamente tu cuenta de LALIGA entre accesos.";
  }
  return null;
}
