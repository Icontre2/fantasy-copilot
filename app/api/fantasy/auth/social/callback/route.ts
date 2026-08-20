import { canjearCodigo, configAuth } from "@/src/server/auth/supabase-oauth";
import { COOKIE_INTENTO, cookieDeError, cookieDeUsuario, leerCookie, limpiarIntento } from "@/src/server/auth/cookies";
import { caducado, desempaquetar, mismoState } from "@/src/server/auth/pkce";
import { firmarIdentidad } from "@/src/server/auth/identity";
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

  const canje = await canjearCodigo(config, codigo, intento.verifier);
  if ("error" in canje) return fallo(canje.error);

  const firmada = firmarIdentidad(`supabase:${canje.usuario.id}`);
  if (!firmada) return fallo("Falta la clave de firma del servidor (SESSION_ENCRYPTION_KEY).");

  const headers = new Headers({ Location: inicio, "Cache-Control": "no-store" });
  headers.append("Set-Cookie", limpiarIntento());
  headers.append("Set-Cookie", cookieDeUsuario(firmada));
  registrarAcceso("social");
  return new Response(null, { status: 302, headers });
}
