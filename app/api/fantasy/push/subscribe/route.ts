import { privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { readSessionId } from "@/src/server/laliga/session";
import { hasPersistentStorage } from "@/src/server/laliga/session";
import { guardarSuscripcion } from "@/src/server/alerts/push-store";
import { configVapid } from "@/src/server/alerts/push-send";

export const dynamic = "force-dynamic";

type Body = { leagueId?: unknown; endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

/**
 * POST /api/fantasy/push/subscribe — activa los avisos para una liga.
 *
 * `requireSession` exige una sesión válida, pero eso no basta: guardar la
 * suscripción SIN sesión persistente sería prometer un aviso que nunca puede
 * llegar, porque el cron no tendría sesión que usar para leer tus datos
 * mañana. Por eso se comprueba `hasPersistentStorage()` aparte y se dice la
 * verdad si falta, en vez de guardar algo que no va a funcionar.
 */
export async function POST(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  if (!configVapid()) {
    return privateJson({ error: "Los avisos push no están configurados en este despliegue." }, 501);
  }
  if (!hasPersistentStorage()) {
    return privateJson(
      { error: "Los avisos necesitan una sesión persistente (base de datos + clave de cifrado fija)." },
      501,
    );
  }

  const sessionId = readSessionId(request);
  if (!sessionId) return privateJson({ error: "No hay sesión." }, 401);

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Petición no válida." }, 400);
  }

  const { leagueId, endpoint, keys } = body;
  if (
    typeof leagueId !== "string" || !leagueId ||
    typeof endpoint !== "string" || !endpoint ||
    typeof keys?.p256dh !== "string" || !keys.p256dh ||
    typeof keys?.auth !== "string" || !keys.auth
  ) {
    return privateJson({ error: "Faltan datos de la suscripción." }, 400);
  }

  await guardarSuscripcion(sessionId, leagueId, { endpoint, p256dh: keys.p256dh, auth: keys.auth });
  return privateJson({ ok: true });
}
