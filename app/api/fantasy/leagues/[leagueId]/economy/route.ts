import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { buildEconomy, SALDO_INICIAL } from "@/src/server/laliga/economy/activity";
import { getLeagueActivity, getLeagueSnapshot } from "@/src/server/laliga/read";

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
    const [snapshot, activity] = await Promise.all([
      getLeagueSnapshot(auth.token, leagueId),
      getLeagueActivity(auth.token, leagueId),
    ]);

    const economies = buildEconomy({
      managers: snapshot.teams.map((team) => ({
        managerId: team.manager.id,
        managerName: team.manager.name,
        puntos: team.teamPoints ?? 0,
        // LALIGA solo publica la caja del manager conectado. Para el resto va
        // `null`, y la diferencia de conciliacion queda sin calcular en vez de
        // compararse contra un cero inventado.
        cajaOficial: team.teamMoney ?? null,
      })),
      activity,
    });

    const fechas = activity.map((entry) => entry.createdAt).sort();

    return privateJson({
      leagueId,
      saldoInicial: SALDO_INICIAL,
      /** Desde cuando hay operaciones. Lo anterior no lo guarda LALIGA. */
      actividadDesde: fechas[0] ?? null,
      actividadHasta: fechas.at(-1) ?? null,
      operaciones: activity.length,
      economies: economies.sort((a, b) => b.cajaReconstruida - a.cajaReconstruida),
      dataNotes: [
        `Todos los managers empiezan con ${(SALDO_INICIAL / 1_000_000).toFixed(0)} M€. La caja se reconstruye restando compras, sumando ventas y añadiendo 100.000 € por punto.`,
        "Los importes de compras y ventas los PUBLICA LALIGA en la actividad de la liga: son exactos, no estimados.",
        fechas[0]
          ? `La actividad disponible empieza el ${fechas[0].slice(0, 10)}. LALIGA no guarda lo anterior, así que esos movimientos aparecen dentro de la diferencia.`
          : "LALIGA no ha devuelto ninguna operación de esta liga.",
        "«Caja oficial» solo la publica LALIGA para tu cuenta. La de los demás es reconstruida, y su diferencia no se puede comprobar.",
        "La diferencia es lo que la actividad disponible no explica: recompensas diarias reclamadas, operaciones anteriores al inicio del histórico o movimientos que LALIGA no publica. Se muestra siempre.",
        "Solo se sugiere «días de recompensa» cuando la diferencia es positiva y múltiplo exacto de 100.000 €. En cualquier otro caso queda sin explicar.",
      ],
    });
  } catch (error) {
    return errorJson(error);
  }
}
