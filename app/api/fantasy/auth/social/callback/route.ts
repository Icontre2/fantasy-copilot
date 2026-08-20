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
import { firmarIdentidad } from "@/src/server/auth/identity";
import {
  claveDeEnlace,
  credencialAdmin,
  credencialDeUsuario,
  guardarEnlace,
  identidadDeUsuario,
  leerEnlace,
  type Credencial,
} from "@/src/server/auth/links";
import {
  buildSessionCookies,
  createSession,
  readSessionId,
  tokenSetDeSesion,
  tokensVigentes,
} from "@/src/server/laliga/session";
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
   * La cookie de identidad es un extra, no un requisito. Antes, si faltaba la
   * clave de firma, el acceso entero se caía con un mensaje técnico — y es justo
   * el despliegue donde más falta hace que Google funcione. Ahora, sin clave, el
   * acceso sigue adelante: lo único que se pierde es el atajo de `access.ts`,
   * que además solo aplica con clave administrativa.
   */
  const firmada = firmarIdentidad(identidad);
  if (firmada) headers.append("Set-Cookie", cookieDeUsuario(firmada));

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

/**
 * Lo que hay que contarle al usuario al volver. Las dos mitades pueden estar
 * vacías: la primera vez que entras con Google no hay nada que enlazar todavía y
 * tampoco nada que celebrar.
 */
type Resultado = { bien?: string; problema?: string };

/**
 * Guarda o restaura el enlace, y añade a la respuesta las cookies que hagan
 * falta.
 *
 * Ningún fallo de aquí tumba el acceso: identificarse con Google ha funcionado y
 * eso ya vale. Lo peor que puede pasar es que haya que conectar LALIGA a mano,
 * que es exactamente lo que pasaba siempre antes.
 */
async function resolverEnlace(
  request: Request,
  credencial: Credencial,
  identidad: string,
  headers: Headers,
): Promise<Resultado> {
  const sesionActual = await tokenSetDeSesion(readSessionId(request)).catch(() => null);

  /*
   * La clave con la que se cifra la fila. La deriva la propia base de datos a
   * partir de tu identidad, así que es estable entre despliegues sin necesidad
   * de configurar nada. Si además hay `SESSION_ENCRYPTION_KEY`, entra también.
   */
  const clave = await claveDeEnlace(credencial);
  if (!clave) {
    return sesionActual
      ? { problema: "No se ha podido preparar el cifrado del enlace. Vuelve a intentarlo desde «Más»." }
      : {};
  }

  if (sesionActual) {
    const vigentes = await tokensVigentes(sesionActual);
    if (!vigentes) {
      return { problema: "Tu sesión de LALIGA ha caducado. Vuelve a conectarla para dejarla enlazada." };
    }

    try {
      // El correo lo guarda la ruta de contraseña, que es la que lo conoce. Aquí
      // solo tenemos el de Google, y meterlo en `laliga_email` sería mentir.
      await guardarEnlace(credencial, identidad, vigentes, null, clave);
    } catch {
      return { problema: "No se ha podido dejar enlazada tu cuenta de LALIGA. Vuelve a intentarlo desde «Más»." };
    }
    return { bien: "Cuenta enlazada. La próxima vez entra con Google y no te pedirá la contraseña de LALIGA." };
  }

  const enlace = await leerEnlace(credencial, identidad, clave).catch(() => null);
  if (!enlace) return {}; // Primera vez: toca conectar LALIGA. La pantalla ya lo dice.

  const vigentes = await tokensVigentes(enlace.tokens);
  if (!vigentes) {
    return { problema: "Tu cuenta de LALIGA estaba enlazada, pero el permiso ha caducado. Conéctala otra vez." };
  }

  // Aquí es donde «entrar con Google» pasa de identificarte a meterte dentro.
  for (const cookie of buildSessionCookies(await createSession(vigentes))) {
    headers.append("Set-Cookie", cookie);
  }
  return { bien: "Has entrado con Google, sin escribir ninguna contraseña." };
}
