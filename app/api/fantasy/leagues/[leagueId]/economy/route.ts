import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { buildEconomyReport } from "@/src/server/laliga/economy/sync";
import { describeSchedule, readSubscription } from "@/src/server/laliga/economy/schedule";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/leagues/{leagueId}/economy
 *
 * Ledger por manager: solo LEE lo ya persistido y lo cruza con el saldo oficial
 * en vivo. Para detectar operaciones nuevas hay que llamar antes a
 * `POST .../economy/sync`.
 *
 * Incluye el estado de la sincronizacion automatica en la misma respuesta: es
 * parte de como hay que leer estas cifras (si lleva dias parada, el desglose
 * tiene huecos), no un detalle de configuracion aparte.
 */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    const [report, subscription] = await Promise.all([
      buildEconomyReport(auth.token, leagueId),
      readSubscription(leagueId),
    ]);
    return privateJson({ ...report, schedule: describeSchedule(subscription) });
  } catch (error) {
    return errorJson(error);
  }
}
