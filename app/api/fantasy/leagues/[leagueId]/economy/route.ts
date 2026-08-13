import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { buildEconomyReport } from "@/src/server/laliga/economy/sync";
import { describeSchedule, readSubscription } from "@/src/server/laliga/economy/schedule";
import { hasPersistentStorage } from "@/src/server/laliga/session";

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

  // El ledger es un HISTORICO: se construye acumulando fotos, asi que sin donde
  // guardarlas no hay nada que enseñar. Se dice explicitamente en vez de
  // devolver un 500 o, peor, una tabla de ceros que pareceria un resultado.
  if (!hasPersistentStorage()) {
    return privateJson({
      leagueId,
      trackedSince: null,
      ledgers: [],
      storageRequired: true,
      dataNotes: [
        'Esta pantalla necesita base de datos y no hay ninguna configurada.',
        'LALIGA no publica historico de operaciones: la unica forma de saber que ha pasado es guardar fotos de la liga y compararlas. Sin donde guardarlas no hay desglose posible.',
        'Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY y aplica supabase/migrations/. Las demas pantallas funcionan sin esto.',
      ],
    });
  }

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
