import { canjearCodigo, configAuth } from "@/src/server/auth/supabase-oauth";
import {
  COOKIE_INTENTO,
  cookieDeAviso,
  cookieDeError,
  cookieDeUsuario,
  leerCookie,
  limpiarIntento,
} from "@/src/server/auth/cookies";
import { caducado, desempaquetar, mismoState } from "@/src/server/auth/pkce";
import { credencialAdmin, credencialDeUsuario, identidadDeUsuario } from "@/src/server/auth/links";
import { resolverEnlace } from "@/src/server/auth/social-callback";
import { registrarAcceso, registrarFallo } from "@/src/server/observability/login-metrics";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/auth/social/callback — la vuelta desde el proveedor.
 *
 * Termina siempre en una redirección a la portada. Nunca devuelve JSON: aquí
 * llega el NAVEGADOR del usuario, no una llamada de JavaScript, y enseñarle un
 * objeto en crudo sería dejarlo tirado en una página en blanco.
 *
 * El orden de las comprobaciones no es casual: primero se mira que la vuelta sea
 * legítima, y solo entonces se canjea el código. Canjear antes gastaría un
 * código que quizá no era nuestro.
 *
 * El motivo del fallo viaja en una cookie de un minuto, no en la dirección: si
 * fuera en la dirección se quedaría ahí, y recargar volvería a enseñar un error
 * que ya no es cierto.
 *
 * ── Por qué el enlace con LALIGA se resuelve AQUÍ ────────────────────────────
 * Esta es la única petición de toda la app en la que tenemos a la vez las dos
 * mitades: quién eres para Google y —si ya habías entrado— tu sesión de LALIGA.
 * Antes el enlace se intentaba guardar al entrar con la contraseña, y en ese
 * momento no hay ningún token de Supabase con el que poder escribir en la base
 * sin clave administrativa. Por eso hacía falta `service_role`, por eso no
 * estaba puesta, y por eso «entrar con Google» acababa pidiendo la contraseña
 * igual.
 *
 * Haciéndolo aquí basta con la clave publicable y las reglas de la tabla:
 *
 *   - Vienes CON sesión de LALIGA  → se guarda el enlace. Esto es «vincular».
 *   - Vienes SIN sesión de LALIGA  → se lee el enlace y se te abre la sesión.
 *
 * La lógica de esa parte vive en `social-callback.ts`, separada de esta ruta:
 * es lo que la hace probable con `node --test` sin pasar por el compilador de
 * Next, que es quien resuelve el alias `@/` de aquí arriba.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const inicio = new URL("/", url.origin).toString();

  const fallo = (motivo: string) => {
    registrarFallo("social", motivo);
    const headers = new Headers({ Location: inicio, "Cache-Control": "no-store" });
    headers.append("Set-Cookie", limpiarIntento());
    headers.append("Set-Cookie", cookieDeError(motivo));
    return new Response(null, { status: 302, headers });
  };

  /*
   * Si el usuario le da a «Cancelar» en el proveedor, vuelve con un error y sin
   * código. No es un fallo: es una decisión suya, y se cuenta como tal.
   */
  const rechazo = url.searchParams.get("error") ?? url.searchParams.get("error_code");
  if (rechazo) {
    const descripcion = url.searchParams.get("error_description");
    return fallo(
      rechazo === "access_denied"
        ? "No has autorizado el acceso, así que no se ha hecho nada."
        : `El proveedor no completó el acceso: ${descripcion ?? rechazo}`,
    );
  }

  const config = configAuth();
  if (!config) return fallo("El acceso con proveedor no está configurado en este despliegue.");

  const galleta = leerCookie(request, COOKIE_INTENTO);
  const intento = galleta ? desempaquetar(galleta) : null;
  if (!intento) return fallo("No hay ningún acceso en curso. Vuelve a pulsar el botón.");
  if (caducado(intento, Date.now())) return fallo("El acceso ha tardado demasiado. Vuelve a intentarlo.");

  /*
   * `state` solo se comprueba si el proveedor lo devuelve. Supabase ata la
   * petición con PKCE —el código no sirve sin el secreto que solo tiene este
   * servidor— así que la protección de fondo está; esto es una comprobación de
   * más cuando hay con qué hacerla, no la única defensa.
   */
  const state = url.searchParams.get("state");
  if (state !== null && !mismoState(intento.state, state)) {
    return fallo("La respuesta no corresponde a este acceso.");
  }

  const codigo = url.searchParams.get("code");
  if (!codigo) return fallo("El proveedor no ha devuelto ningún código de acceso.");

  const resultado = await canjearCodigo(config, codigo, intento.verifier);
  if ("error" in resultado) return fallo(resultado.error);
  const { canje } = resultado;

  const identidad = identidadDeUsuario(canje.usuario.id);
  const headers = new Headers({ Location: inicio, "Cache-Control": "no-store" });
  headers.append("Set-Cookie", limpiarIntento());

  /*
   * La cookie de identidad lleva el token de Supabase tal cual.
   *
   * Antes llevaba la identidad firmada con una clave del servidor, y sin esa
   * clave —el caso real de este despliegue— no se ponía nada: la app no volvía a
   * saber quién eras, así que al conectar LALIGA no había a quién asociar el
   * enlace. De ahí que hubiera que ir a un menú a enlazar a mano.
   *
   * El token no hace falta firmarlo: ya viene firmado por Supabase, y a Supabase
   * se le pregunta si vale cada vez que se usa. Ver `identity.ts`.
   */
  headers.append("Set-Cookie", cookieDeUsuario(canje.accessToken));

  /*
   * Menos privilegio primero: con el JWT del propio usuario, la base solo le
   * deja tocar su fila. La clave administrativa es el respaldo para despliegues
   * que aún no tengan las políticas aplicadas.
   */
  const credencial = credencialDeUsuario(canje.accessToken) ?? credencialAdmin();

  if (credencial) {
    const resultadoDelEnlace = await resolverEnlace(request, credencial, identidad, headers);
    if (resultadoDelEnlace.problema) {
      headers.append("Set-Cookie", cookieDeError(resultadoDelEnlace.problema));
    } else if (resultadoDelEnlace.bien) {
      headers.append("Set-Cookie", cookieDeAviso(resultadoDelEnlace.bien));
    }
  }

  registrarAcceso("social");
  return new Response(null, { status: 302, headers });
}
