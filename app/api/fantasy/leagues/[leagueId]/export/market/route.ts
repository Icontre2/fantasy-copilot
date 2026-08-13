import { csvResponse, errorJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { computeDailyTrend } from "@/src/server/laliga/alerts/clause-alerts";
import { exportFilename } from "@/src/server/laliga/exports/csv";
import { buildMarketCsv, type MarketRow } from "@/src/server/laliga/exports/league-export";
import { getLeagueMarket, getMarketValueHistory } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/leagues/{leagueId}/export/market
 * Descarga `mercado_<leagueId>_<fecha>.csv`.
 *
 * La tendencia se calcula pidiendo el historico publico de cada jugador del
 * mercado. El mercado tiene pocas entradas a la vez, asi que aqui no hace falta
 * el prefiltro que si lleva la pantalla de alertas.
 */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    const market = await getLeagueMarket(auth.token, leagueId);

    const rows: MarketRow[] = await Promise.all(
      market.map(async (entry) => {
        try {
          const history = await getMarketValueHistory(entry.player.id);
          return { entry, dailyTrend: computeDailyTrend(history)?.dailyTrend ?? null };
        } catch {
          // Sin historico la fila sale igual, con la tendencia vacia: es mejor
          // exportar el mercado sin una columna que no exportarlo.
          return { entry, dailyTrend: null };
        }
      }),
    );

    return csvResponse(buildMarketCsv(rows), exportFilename("mercado", leagueId));
  } catch (error) {
    return errorJson(error);
  }
}
