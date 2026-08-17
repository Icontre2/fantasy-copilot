import { errorJson, privateJson } from "@/src/server/http/responses";
import { getMyProfile } from "@/src/server/laliga/read";
import { diagnosticoDeSesion, getValidAccessToken, readSessionId } from "@/src/server/laliga/session";

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
  const token = await getValidAccessToken(readSessionId(request));
  if (!token) return privateJson({ authenticated: false, session });

  try {
    return privateJson({ authenticated: true, manager: await getMyProfile(token), session });
  } catch (error) {
    return errorJson(error);
  }
}
