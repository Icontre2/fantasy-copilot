import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { buildEconomy, SALDO_INICIAL } from "@/src/server/laliga/economy/activity";
import { getLeagueActivity, getLeagueSnapshot, getPlayerCatalog } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/fantasy/leagues/{leagueId}/economy
 *
 * Reconstruye la caja con:
 *   saldo inicial + ventas - compras + puntos - inversión estimada en cláusulas.
 *
 * Compras/ventas salen del historial exacto publicado por LALIGA. La inversión
 * en subir cláusulas se estima desde la plantilla actual y se etiqueta siempre
 * como tal, porque LALIGA no publica de forma fiable ese movimiento económico
 * como una operación separada en el historial.
 */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    const [snapshot, activity, catalog] = await Promise.all([
      getLeagueSnapshot(auth.token, leagueId),
      getLeagueActivity(auth.token, leagueId),
      getPlayerCatalog(),
    ]);

    const economies = buildEconomy({
      managers: snapshot.teams.map((team) => ({
        managerId: team.manager.id,
        managerName: team.manager.name,
        puntos: snapshot.standing.find((row) => row.teamId === team.teamId)?.points ?? team.teamPoints ?? 0,
        cajaOficial: team.teamMoney ?? null,
        clausePlayers: team.players.map((player) => ({
          id: player.id,
          name: player.name,
          marketValue: player.marketValue,
          buyoutClause: player.buyoutClause,
        })),
      })),
      activity,
      playerNames: new Map(catalog.map((player) => [player.id, player.name])),
    });

    const fechas = activity.map((entry) => entry.createdAt).sort();

    return privateJson({
      leagueId,
      saldoInicial: SALDO_INICIAL,
      actividadDesde: fechas[0] ?? null,
      actividadHasta: fechas.at(-1) ?? null,
      operaciones: activity.length,
      economies: economies.sort((a, b) => b.cajaReconstruida - a.cajaReconstruida),
      dataNotes: [
        `Todos los managers empezaron con ${(SALDO_INICIAL / 1_000_000).toFixed(0)} M€. Si falta caja oficial, se reconstruye por manager con sus operaciones, puntos y gasto estimado en blindar cláusulas.`,
        "Los importes de compras y ventas los PUBLICA LALIGA en la actividad de la liga: son exactos, no estimados.",
        "Subir una cláusula consume presupuesto en proporción 1:2: cada 1 M€ gastado aumenta 2 M€ la cláusula. Ese coste sí se descuenta de la caja reconstruida.",
        "El gasto en cláusulas se etiqueta como ESTIMADO: se toma solo la parte de la cláusula actual que supera el mayor entre la cláusula automática esperable y el último precio de adquisición conocido. Así se evita atribuir a blindaje una cláusula alta que pueda venir del propio fichaje.",
        fechas[0]
          ? `Historial paginado completo: ${activity.length} entradas desde el ${fechas[0].slice(0, 10)}. Se recorren /activity/0, /1, /2… hasta la primera página vacía.`
          : "LALIGA no ha devuelto ninguna operación de esta liga.",
        "El valor de la plantilla nunca se usa como caja. Solo se usa el valor individual del jugador para estimar el suelo automático de su cláusula.",
        "La diferencia frente a la caja oficial sigue mostrándose: puede recoger recompensas diarias, movimientos antiguos o desviación de la estimación de blindaje.",
      ],
    });
  } catch (error) {
    return errorJson(error);
  }
}
