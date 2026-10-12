import { csvResponse, errorJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { computeDailyTrend } from "@/src/server/laliga/alerts/clause-alerts";
import { exportFilename } from "@/src/server/laliga/exports/csv";
import { buildFullCsv } from "@/src/server/laliga/exports/full-export";
import { getLeagueMarket, getLeagueSnapshot, getMarketValueHistory, getPlayerCatalog } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/fantasy/leagues/{leagueId}/export/full
 * Descarga `juego_completo_<leagueId>_<fecha>.csv`: todos los jugadores del
 * juego, con su dueño en tu liga y su entrada de mercado si la tienen.
 *
 * Si el catálogo falla se exporta igual con los jugadores de la liga y del
 * mercado: es menos completo, pero lo que sale sigue siendo cierto.
 */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    const [snapshot, market, catalog] = await Promise.all([
      getLeagueSnapshot(auth.token, leagueId),
      getLeagueMarket(auth.token, leagueId),
      getPlayerCatalog().catch(() => []),
    ]);

    // Tendencia solo para el mercado, como el CSV de mercado: son pocas
    // entradas y el histórico va cacheado.
    const trends = new Map(
      await Promise.all(
        market.map(async (entry) => {
          try {
            const history = await getMarketValueHistory(entry.player.id);
            return [entry.player.id, computeDailyTrend(history)?.dailyTrend ?? null] as const;
          } catch {
            return [entry.player.id, null] as const;
          }
        }),
      ),
    );

    const exportedAt = new Date();
    return csvResponse(
      buildFullCsv({ catalog, teams: snapshot.teams, standing: snapshot.standing, market, trends }, exportedAt),
      exportFilename("juego_completo", leagueId, exportedAt),
    );
  } catch (error) {
    return errorJson(error);
  }
}
