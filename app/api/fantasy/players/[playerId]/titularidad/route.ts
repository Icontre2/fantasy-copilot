import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getPlayerCatalog } from "@/src/server/laliga/read";
import { conProbabilidades } from "@/src/server/laliga/probable-lineup";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/fantasy/players/{playerId}/titularidad
 *
 * Lo que la ficha necesita para predecir sus puntos, sea cual sea la pantalla
 * desde la que se abre: estado oficial (lesionado, en duda…), club, media,
 * racha y probabilidad de titular de FútbolFantasy.
 *
 * Existe porque la ficha se abre desde seis sitios y no todos traen esos
 * datos: desde Alertas o Liga llegaba sin probabilidad, y la previsión salía
 * peor que desde Plantilla. Una petición a una sola página de FútbolFantasy,
 * que además queda en caché una hora.
 */
export async function GET(request: Request, { params }: { params: Promise<{ playerId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;
  const { playerId } = await params;

  try {
    const catalogo = await getPlayerCatalog();
    const jugador = catalogo.find((p) => p.id === playerId);
    if (!jugador) return privateJson({ error: "Este jugador no está en el catálogo de la temporada." }, 404);
    const [conProb] = await conProbabilidades([jugador], catalogo).catch(() => [jugador]);
    return privateJson({ player: conProb ?? jugador });
  } catch (error) {
    return errorJson(error);
  }
}
