import { errorJson, privateJson, privateJsonWithCookies } from "@/src/server/http/responses";
import { passwordLogin } from "@/src/server/laliga/auth";
import { getMyProfile } from "@/src/server/laliga/read";
import { buildSessionCookies, createSession } from "@/src/server/laliga/session";
import { claveDeEnlace, credencialAdmin, credencialDeUsuario, guardarEnlace } from "@/src/server/auth/links";
import { identidadDePeticion } from "@/src/server/auth/identity";
import { registrarAcceso, registrarFallo, registrarIntento } from "@/src/server/observability/login-metrics";
import type { TokenSet } from "@/src/server/laliga/auth";

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
     * pedirse. Es justo el paso que convierte "entrar con Google" en algo util,
     * y es AQUI donde tiene que pasar: es el momento en el que el usuario acaba
     * de hacerlo, sin menus escondidos de por medio.
     *
     * Antes no se podia porque la peticion no traia ningun token de Supabase.
     * Ahora la cookie de identidad lleva el del propio usuario, verificado
     * contra Supabase, y con el se escribe SU fila y ninguna otra.
     *
     * Si falla el guardado NO se tumba el login: acabas de identificarte bien y
     * mereces entrar. Lo unico que pasa es que la proxima vez habra que
     * reconectar.
     */
    await guardarEnlaceSiProcede(request, tokens, email);

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

/**
 * Deja la cuenta de LALIGA enlazada con la identidad social, si la hay.
 *
 * No lanza nunca: quien acaba de escribir bien su contraseña entra, pase lo que
 * pase con el enlace. Lo peor que ocurre es que la próxima vez toque repetirlo.
 *
 * Se prefiere la credencial del propio usuario a la administrativa: hace lo
 * mismo y solo alcanza su fila.
 */
async function guardarEnlaceSiProcede(request: Request, tokens: TokenSet, email: string): Promise<void> {
  try {
    const quien = await identidadDePeticion(request);
    if (!quien) return;

    const credencial = credencialDeUsuario(quien.accessToken) ?? credencialAdmin();
    if (!credencial) return;

    /*
     * Se dice de quién es la clave incluso yendo con la credencial del propio
     * usuario: para él es redundante —la base ya lo sabe— pero es lo único que
     * hace funcionar el respaldo administrativo, donde no hay nadie delante. La
     * base rechaza pedir la de otro, así que decirlo no abre ninguna puerta.
     */
    const clave = await claveDeEnlace(credencial, quien.uuid);
    if (!clave) return;

    await guardarEnlace(credencial, quien.identidad, tokens, email, clave);
  } catch {
    return;
  }
}
