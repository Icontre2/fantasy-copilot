import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { buildEconomy, SALDO_INICIAL } from "@/src/server/laliga/economy/activity";
import { getLeagueActivity, getLeagueSnapshot, getPlayerCatalog } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/fantasy/leagues/{leagueId}/economy
 *
 * Contabilidad de la liga reconstruida desde el saldo inicial con las
 * operaciones que LALIGA publica, con su importe exacto.
 *
 * Ya no necesita base de datos: antes había que guardar fotos de la liga para
 * poder inferir los importes comparándolas. Ahora los importes vienen
 * publicados, así que basta con leer.
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
        // LALIGA solo publica la caja del manager conectado. Para el resto va
        // `null`, y la diferencia de conciliacion queda sin calcular en vez de
        // compararse contra un cero inventado.
        cajaOficial: team.teamMoney ?? null,
      })),
      activity,
      playerNames: new Map(catalog.map((player) => [player.id, player.name])),
    });

    const fechas = activity.map((entry) => entry.createdAt).sort();

    return privateJson({
      leagueId,
      saldoInicial: SALDO_INICIAL,
      /** Primera operación tras recorrer todas las páginas del historial. */
      actividadDesde: fechas[0] ?? null,
      actividadHasta: fechas.at(-1) ?? null,
      operaciones: activity.length,
      economies: economies.sort((a, b) => b.flujoConocido - a.flujoConocido),
      dataNotes: [
        `Todos los managers empezaron con ${(SALDO_INICIAL / 1_000_000).toFixed(0)} M€. Si falta caja oficial, se reconstruye por manager con sus operaciones y puntos; nunca se traslada el ajuste de otra persona.`,
        "Los importes de compras y ventas los PUBLICA LALIGA en la actividad de la liga: son exactos, no estimados.",
        fechas[0]
          ? `Historial paginado completo: ${activity.length} entradas desde el ${fechas[0].slice(0, 10)}. Se recorren /activity/0, /1, /2… hasta la primera página vacía.`
          : "LALIGA no ha devuelto ninguna operación de esta liga.",
        "La app intenta obtener la caja oficial en la lista y también equipo a equipo. Si ambas rutas la omiten, calcula 100 M + ventas − compras + puntos; el resultado puede ser negativo.",
        "El valor de la plantilla nunca se usa para calcular la caja ni el flujo.",
        "La diferencia es lo que el historial no explica, principalmente recompensas diarias reclamadas u otros movimientos que LALIGA no publique. Se muestra siempre.",
        "Solo se sugiere «días de recompensa» cuando la diferencia es positiva y múltiplo exacto de 100.000 €. En cualquier otro caso queda sin explicar.",
      ],
    });
  } catch (error) {
    return errorJson(error);
  }
}
