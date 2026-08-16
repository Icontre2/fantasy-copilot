import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getCalendar, getCurrentWeekPublic } from "@/src/server/laliga/read";
import { getCuotas, hayClaveDeCuotas } from "@/src/server/odds/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** La liga tiene 38 jornadas; fuera de ahí LALIGA responde 500. */
const PRIMERA = 1;
const ULTIMA = 38;

/**
 * GET /api/fantasy/calendar?week=N
 *
 * Horarios de una jornada. Sin `week` devuelve la jornada en curso.
 *
 * Ni el calendario ni la jornada actual necesitan token, pero la ruta sigue
 * pidiendo sesión como todas las demás: esta app no tiene pantallas públicas y
 * abrir una excepción solo aquí sería una puerta que nadie recordaría cerrar.
 */
export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  try {
    const actual = await getCurrentWeekPublic();
    const pedida = Number(new URL(request.url).searchParams.get("week"));
    // Si el número no vale, se enseña la jornada en curso en vez de fallar.
    const week = Number.isFinite(pedida) && pedida >= PRIMERA && pedida <= ULTIMA
      ? Math.trunc(pedida)
      : actual.weekNumber;

    const [matches, cuotas] = await Promise.all([getCalendar(week), getCuotas()]);

    /*
     * Las cuotas se pegan al partido por los dos equipos a la vez. Si la casa no
     * tiene ese partido abierto —los de dentro de tres meses no lo están— se
     * queda sin cuotas, y eso NO es lo mismo que no tenerlas configuradas: la
     * pantalla dice una cosa u otra según `cuotasDisponibles`.
     */
    const conCuotas = matches.map((match) => ({
      ...match,
      odds:
        cuotas?.find(
          (entrada) => entrada.localId === match.local?.id && entrada.visitorId === match.visitor?.id,
        ) ?? null,
    }));

    return privateJson({
      week,
      currentWeek: actual.weekNumber,
      isLive: actual.isLive,
      firstWeek: PRIMERA,
      lastWeek: ULTIMA,
      matches: conCuotas,
      cuotasDisponibles: hayClaveDeCuotas(),
      dataNotes: [
        "Horarios y marcadores publicados por LALIGA. Un partido sin marcador es que todavía no se ha jugado.",
        "La hora se muestra en la del dispositivo, convertida desde la que publica LALIGA.",
        ...(hayClaveDeCuotas()
          ? [
              "Las cuotas son el precio de una casa de apuestas, no un pronóstico de esta app. Se indica siempre cuál las publica.",
              "El porcentaje SÍ es un cálculo nuestro: la probabilidad implícita de la cuota, repartiendo el margen de la casa entre los tres resultados.",
            ]
          : []),
      ],
    });
  } catch (error) {
    return errorJson(error);
  }
}
