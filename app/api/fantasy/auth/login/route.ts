import { errorJson, privateJson, privateJsonWithCookies } from "@/src/server/http/responses";
import { passwordLogin } from "@/src/server/laliga/auth";
import { getMyProfile } from "@/src/server/laliga/read";
import { buildSessionCookies, createSession } from "@/src/server/laliga/session";
import { claveDeEnlace, credencialAdmin, guardarEnlace, uuidDeIdentidad } from "@/src/server/auth/links";
import { identidadDePeticion } from "@/src/server/auth/identity";
import { registrarAcceso, registrarFallo, registrarIntento } from "@/src/server/observability/login-metrics";

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

  registrarIntento("password");
  try {
    const tokens = await passwordLogin(email, password);
    const manager = await getMyProfile(tokens.accessToken);
    const sessionId = await createSession(tokens);

    /*
     * Si ya habias entrado con Google, esta contraseña sirve ademas para dejar
     * conectada tu cuenta de LALIGA: se guarda el enlace y ya no vuelve a
     * pedirse. Es justo el paso que convierte "entrar con Google" en algo util.
     *
     * Aqui solo se puede con clave administrativa: en esta peticion no hay
     * ningun token de Supabase con el que escribir en nombre del usuario. Sin
     * ella el enlace se guarda igual, pero al volver del proveedor —que es donde
     * si tenemos ese token— en vez de aqui.
     *
     * Si falla el guardado NO se tumba el login: acabas de identificarte bien y
     * mereces entrar. Lo unico que pasa es que la proxima vez habra que
     * reconectar, y eso la pantalla ya lo sabe decir.
     */
    const identidad = identidadDePeticion(request);
    const credencial = credencialAdmin();
    const quien = identidad ? uuidDeIdentidad(identidad) : null;
    if (identidad && credencial && quien) {
      await claveDeEnlace(credencial, quien)
        .then((clave) => (clave ? guardarEnlace(credencial, identidad, tokens, email, clave) : undefined))
        .catch(() => undefined);
    }

    registrarAcceso("password");
    return privateJsonWithCookies({ manager }, buildSessionCookies(sessionId));
  } catch (error) {
    /*
     * Aqui es donde se ve si la gente rebota por tener una cuenta social de
     * LALIGA. Solo se apunta el codigo de B2C, nunca el correo ni el texto
     * crudo del error, que puede llevarlo dentro.
     */
    registrarFallo("password", error);
    return errorJson(error);
  }
}
