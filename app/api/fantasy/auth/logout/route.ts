import { privateJsonWithCookies } from "@/src/server/http/responses";
import { buildClearCookies, destroySession, readSessionId } from "@/src/server/laliga/session";
import { limpiarUsuario } from "@/src/server/auth/cookies";

export const dynamic = "force-dynamic";

/**
 * POST /api/fantasy/auth/logout — cierra la sesión.
 *
 * Se borra también la cookie de identidad, así que salir te saca del todo:
 * dejarla puesta haría que al recargar volvieras a entrar solo, que es
 * exactamente lo contrario de lo que pide quien pulsa «salir».
 *
 * Lo que NO se borra es el enlace con LALIGA guardado en la base: salir no es
 * desconectar la cuenta. Cuando vuelvas a entrar con Google seguirá ahí y no
 * tendrás que escribir la contraseña otra vez. Desconectar es otra acción.
 */
export async function POST(request: Request) {
  const sessionId = readSessionId(request);
  if (sessionId) await destroySession(sessionId);
  return privateJsonWithCookies({ authenticated: false }, [...buildClearCookies(), limpiarUsuario()]);
}
