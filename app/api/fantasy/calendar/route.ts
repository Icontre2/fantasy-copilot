import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getCalendar, getCurrentWeekPublic } from "@/src/server/laliga/read";

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

    const matches = await getCalendar(week);

    return privateJson({
      week,
      currentWeek: actual.weekNumber,
      isLive: actual.isLive,
      firstWeek: PRIMERA,
      lastWeek: ULTIMA,
      matches,
      dataNotes: [
        "Horarios y marcadores publicados por LALIGA. Un partido sin marcador es que todavía no se ha jugado.",
        "La hora se muestra en la del dispositivo, convertida desde la que publica LALIGA.",
      ],
    });
  } catch (error) {
    return errorJson(error);
  }
}
