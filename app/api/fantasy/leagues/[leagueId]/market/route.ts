import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getLeagueMarket, getPlayerCatalog } from "@/src/server/laliga/read";
import { conProbabilidades } from "@/src/server/laliga/probable-lineup";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/fantasy/leagues/{leagueId}/market — jugadores a la venta ahora mismo.
 *
 * Cada jugador va con su probabilidad de titular (FútbolFantasy) y su club,
 * que es lo que la pantalla necesita para predecir sus puntos de la jornada
 * con el MISMO modelo que tu plantilla. Si FútbolFantasy no responde, el
 * mercado sale igual, sin ese dato: no se cae una pantalla por un extra.
 */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    const [market, catalog] = await Promise.all([
      getLeagueMarket(auth.token, leagueId),
      getPlayerCatalog().catch(() => null),
    ]);
    if (!catalog) return privateJson({ market });

    const clubDe = new Map(catalog.map((p) => [p.id, p.teamId]));
    const conClub = market.map((entry) => ({ ...entry.player, teamId: entry.player.teamId ?? clubDe.get(entry.player.id) }));
    const enriquecidos = await conProbabilidades(conClub, catalog).catch(() => conClub);
    return privateJson({ market: market.map((entry, i) => ({ ...entry, player: enriquecidos[i] ?? entry.player })) });
  } catch (error) {
    return errorJson(error);
  }
}
