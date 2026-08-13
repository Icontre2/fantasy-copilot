import { errorJson, privateJson, privateJsonWithCookie } from "@/src/server/http/responses";
import { passwordLogin } from "@/src/server/laliga/auth";
import { getMyProfile } from "@/src/server/laliga/read";
import { buildSessionCookie, createSession } from "@/src/server/laliga/session";

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

    return privateJsonWithCookie({ manager }, buildSessionCookie(sessionId));
  } catch (error) {
    return errorJson(error);
  }
}
