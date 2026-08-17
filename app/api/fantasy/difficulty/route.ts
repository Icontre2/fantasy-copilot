import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getCalendar, getCurrentWeekPublic } from "@/src/server/laliga/read";
import { getCuotas } from "@/src/server/odds/football-data";
import { dificultadPorEquipo } from "@/src/server/odds/team-difficulty";
import { FALLBACK_TEAMS } from "@/src/server/laliga/teams";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/fantasy/difficulty
 *
 * Contra quien juega cada equipo en la jornada en curso y a que precio le pone
 * la casa el ganar, indexado por id de equipo.
 *
 * Existe como ruta propia en vez de colgar del dashboard porque quien lo
 * necesita son la ficha del jugador y el campo, y la ficha se abre desde seis
 * pantallas distintas. Pasarlo por props desde cada una seria seis sitios donde
 * olvidarse; una ruta la piden las dos y se acabo.
 */
export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  try {
    const actual = await getCurrentWeekPublic();
    const [matches, cuotas] = await Promise.all([
      getCalendar(actual.weekNumber),
      getCuotas(Object.values(FALLBACK_TEAMS)),
    ]);

    const conCuotas = matches.map((match) => ({
      ...match,
      odds:
        cuotas?.find(
          (entrada) => entrada.localId === match.local?.id && entrada.visitorId === match.visitor?.id,
        ) ?? null,
    }));

    return privateJson({
      week: actual.weekNumber,
      byTeam: dificultadPorEquipo(conCuotas),
      /** `false` = la fuente no respondio. Distinto de "aun no hay cuotas". */
      cuotasDisponibles: cuotas !== null,
    });
  } catch (error) {
    return errorJson(error);
  }
}
