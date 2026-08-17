import { canjearCodigo, configGoogle } from "@/src/server/auth/google";
import { claveDeIdentidad, identidadDe } from "@/src/server/auth/google-claims";
import { COOKIE_INTENTO, cookieDeError, cookieDeUsuario, leerCookie, limpiarIntento } from "@/src/server/auth/cookies";
import { caducado, desempaquetar, mismoState } from "@/src/server/auth/pkce";
import { firmarIdentidad } from "@/src/server/auth/identity";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/auth/google/callback — la vuelta desde Google.
 *
 * Termina siempre en una redirección a la portada, con el motivo en la URL si
 * algo falló. Nunca devuelve JSON: aquí llega el NAVEGADOR del usuario después
 * de Google, no una llamada de JavaScript, y enseñarle un objeto en crudo sería
 * dejarlo tirado en una página en blanco.
 *
 * El orden de las comprobaciones no es casual: primero se mira que la vuelta sea
 * legítima (state y caducidad), y solo entonces se canjea el código. Canjear
 * antes gastaría un código que quizá no era nuestro.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const inicio = new URL("/", url.origin);

  /*
   * El motivo se manda en una cookie de un minuto y no en la dirección, así que
   * la portada queda limpia y el mensaje llega por la misma ruta que el resto de
   * los datos de la pantalla.
   */
  const fallo = (motivo: string) => {
    const headers = new Headers({ Location: inicio.toString(), "Cache-Control": "no-store" });
    headers.append("Set-Cookie", limpiarIntento());
    headers.append("Set-Cookie", cookieDeError(motivo));
    return new Response(null, { status: 302, headers });
  };

  // Si el usuario le da a «Cancelar» en Google, vuelve con `error` y sin código.
  const errorDeGoogle = url.searchParams.get("error");
  if (errorDeGoogle) {
    return fallo(
      errorDeGoogle === "access_denied"
        ? "No has autorizado el acceso con Google."
        : `Google no completó el acceso: ${errorDeGoogle}`,
    );
  }

  const config = configGoogle();
  if (!config) return fallo("El acceso con Google no está configurado en este despliegue.");

  const galleta = leerCookie(request, COOKIE_INTENTO);
  const intento = galleta ? desempaquetar(galleta) : null;
  if (!intento) {
    return fallo("No hay ningún acceso en curso. Vuelve a pulsar el botón de Google.");
  }
  if (caducado(intento, Date.now())) {
    return fallo("El acceso ha tardado demasiado. Vuelve a intentarlo.");
  }

  const state = url.searchParams.get("state") ?? "";
  if (!mismoState(intento.state, state)) {
    // Esto no es un despiste del usuario: o llega de otra pestaña, o alguien
    // está intentando colar un acceso ajeno.
    return fallo("La respuesta de Google no corresponde a este acceso.");
  }

  const codigo = url.searchParams.get("code");
  if (!codigo) return fallo("Google no ha devuelto ningún código de acceso.");

  const canje = await canjearCodigo(config, codigo, intento.verifier);
  if ("error" in canje) return fallo(canje.error);

  const quien = identidadDe(canje.idToken, config.clientId, Date.now());
  if (!quien.ok) return fallo(quien.motivo);

  const firmada = firmarIdentidad(claveDeIdentidad("google", quien.identidad.sub));
  if (!firmada) return fallo("Falta la clave de firma del servidor (SESSION_ENCRYPTION_KEY).");

  const cookies = [limpiarIntento(), cookieDeUsuario(firmada)];
  const headers = new Headers({ Location: inicio.toString(), "Cache-Control": "no-store" });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}
