import { errorJson, privateJson } from "@/src/server/http/responses";
import { getMyProfile } from "@/src/server/laliga/read";
import { getValidAccessToken, readSessionId } from "@/src/server/laliga/session";

export const dynamic = "force-dynamic";

/** GET /api/fantasy/auth/session — quien esta conectado, si es que hay alguien. */
export async function GET(request: Request) {
  const token = await getValidAccessToken(readSessionId(request));
  if (!token) return privateJson({ authenticated: false });

  try {
    return privateJson({ authenticated: true, manager: await getMyProfile(token) });
  } catch (error) {
    return errorJson(error);
  }
}
