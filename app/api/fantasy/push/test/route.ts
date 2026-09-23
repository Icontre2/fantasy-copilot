import { privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { readSessionId } from "@/src/server/laliga/session";
import { borrarSuscripcion, suscripcionesDe } from "@/src/server/alerts/push-store";
import { configVapid, mandarPush } from "@/src/server/alerts/push-send";

export const dynamic = "force-dynamic";

/**
 * POST /api/fantasy/push/test — manda un aviso de prueba a TUS dispositivos
 * suscritos a esta liga.
 *
 * Existe porque sin él no había forma de saber si los avisos funcionaban: el
 * repaso corre cada hora y solo avisa cuando algo cambia, así que un silencio
 * podía ser «no ha pasado nada» o «esto está roto». Usa exactamente el mismo
 * envío que el repaso (`mandarPush`) y solo a las suscripciones de la sesión
 * que lo pide: nadie puede mandar avisos a otro.
 */
export async function POST(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const vapid = configVapid();
  if (!vapid) return privateJson({ error: "Los avisos push no están configurados en este despliegue." }, 501);

  const sessionId = readSessionId(request);
  if (!sessionId) return privateJson({ error: "No hay sesión." }, 401);

  let leagueId: unknown;
  try {
    ({ leagueId } = (await request.json()) as { leagueId?: unknown });
  } catch {
    return privateJson({ error: "Petición no válida." }, 400);
  }
  if (typeof leagueId !== "string" || !leagueId) return privateJson({ error: "Falta la liga." }, 400);

  const suscripciones = await suscripcionesDe(sessionId, leagueId);
  if (suscripciones.length === 0) {
    return privateJson({ error: "Este dispositivo no está suscrito en el servidor. Apaga y vuelve a encender los avisos." }, 409);
  }

  let enviados = 0;
  let fallidos = 0;
  let ultimoError: string | null = null;
  for (const sub of suscripciones) {
    const r = await mandarPush(vapid, sub, {
      titulo: "LigaLab · aviso de prueba",
      cuerpo: "Los avisos funcionan. Te llegarán así cuando cambie algo en tu liga.",
      url: `/?league=${encodeURIComponent(leagueId)}&section=alertas`,
      tag: `prueba-${leagueId}`,
    });
    if (r.ok) {
      enviados += 1;
    } else {
      fallidos += 1;
      ultimoError = r.motivo;
      if (r.suscripcionMuerta) await borrarSuscripcion(sessionId, leagueId, sub.endpoint);
    }
  }

  if (enviados === 0) {
    return privateJson({ error: `El servicio de avisos rechazó el envío${ultimoError ? `: ${ultimoError}` : "."} Apaga y vuelve a encender los avisos.` }, 502);
  }
  return privateJson({ enviados, fallidos });
}
