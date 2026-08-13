import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { syncLeagueEconomy } from "@/src/server/laliga/economy/sync";
import { hasPersistentStorage } from "@/src/server/laliga/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/fantasy/leagues/{leagueId}/economy/sync
 *
 * Toma una foto de la liga, la compara con la anterior y persiste operaciones e
 * ingreso por puntos. Es idempotente: dos llamadas seguidas no duplican nada.
 *
 * Cuanto mas a menudo se llame, mas preciso es el reparto de importes por
 * operacion (ver `economy/transactions.ts`).
 */
export async function POST(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  if (!hasPersistentStorage()) {
    return privateJson(
      {
        error:
          "Sincronizar guarda una foto de la liga para poder compararla con la siguiente, y no hay base de datos configurada donde guardarla.",
        kind: "storage_required",
      },
      409,
    );
  }

  try {
    return privateJson(await syncLeagueEconomy(auth.token, leagueId));
  } catch (error) {
    return errorJson(error);
  }
}
