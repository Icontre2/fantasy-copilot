import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getPlayerCatalog } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";

/** Catálogo completo de jugadores activos de la temporada para Comparativa. */
export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  try {
    const players = (await getPlayerCatalog()).filter((player) => player.status !== "out_of_league");
    return privateJson({ players });
  } catch (error) {
    return errorJson(error);
  }
}
