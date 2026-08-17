import { privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { readSessionId } from "@/src/server/laliga/session";
import { borrarSuscripcion } from "@/src/server/alerts/push-store";

export const dynamic = "force-dynamic";

type Body = { leagueId?: unknown; endpoint?: unknown };

/** POST /api/fantasy/push/unsubscribe — apaga los avisos de una liga en este dispositivo. */
export async function POST(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const sessionId = readSessionId(request);
  if (!sessionId) return privateJson({ error: "No hay sesión." }, 401);

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Petición no válida." }, 400);
  }

  const { leagueId, endpoint } = body;
  if (typeof leagueId !== "string" || !leagueId || typeof endpoint !== "string" || !endpoint) {
    return privateJson({ error: "Faltan datos." }, 400);
  }

  await borrarSuscripcion(sessionId, leagueId, endpoint);
  return privateJson({ ok: true });
}
