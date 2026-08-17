import { errorJson, privateJson, privateJsonWithCookies } from "@/src/server/http/responses";
import { passwordLogin } from "@/src/server/laliga/auth";
import { getMyProfile } from "@/src/server/laliga/read";
import { buildSessionCookies, createSession } from "@/src/server/laliga/session";
import { guardarEnlace, hayAlmacenDeEnlaces, leerEnlace } from "@/src/server/auth/links";
import { identidadDePeticion } from "@/src/server/auth/identity";

export const dynamic = "force-dynamic";

/**
 * POST /api/fantasy/auth/login  { email, password }
 *
 * La contrasena se usa una vez para el intercambio con Azure B2C y se descarta
 * con el ambito de esta funcion. No se registra, no se guarda y no vuelve al
 * cliente. Lo unico que viaja de vuelta es la cookie httpOnly con un id opaco.
 */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "El cuerpo de la peticion no es JSON valido." }, 400);
  }

  const { email, password } = body;
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return privateJson({ error: "Hacen falta email y contrasena." }, 400);
  }

  try {
    const tokens = await passwordLogin(email, password);
    const manager = await getMyProfile(tokens.accessToken);
    const sessionId = await createSession(tokens);

    /*
     * Si ya habias entrado con Google, esta contraseña sirve ademas para dejar
     * conectada tu cuenta de LALIGA: se guarda el enlace y ya no vuelve a
     * pedirse. Es justo el paso que convierte "entrar con Google" en algo util.
     *
     * Si falla el guardado NO se tumba el login: acabas de identificarte bien y
     * mereces entrar. Lo unico que pasa es que la proxima vez habra que
     * reconectar, y eso la pantalla ya lo sabe decir.
     */
    const identidad = identidadDePeticion(request);
    if (identidad && hayAlmacenDeEnlaces()) {
      /*
       * Solo se conecta si esa identidad no tenia ya OTRA cuenta de LALIGA
       * enlazada. La cookie de identidad dura 30 dias y sobrevive a que otra
       * persona use el mismo telefono/navegador despues: sin este chequeo,
       * cualquiera que escriba una contrasena de LALIGA en ese dispositivo
       * reemplazaria en silencio el enlace de quien entro con Google.
       */
      const existente = await leerEnlace(identidad).catch(() => null);
      if (!existente || existente.email === email) {
        await guardarEnlace(identidad, tokens, email).catch(() => undefined);
      }
    }

    return privateJsonWithCookies({ manager }, buildSessionCookies(sessionId));
  } catch (error) {
    return errorJson(error);
  }
}
