import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getCalendar, getCurrentWeekPublic } from "@/src/server/laliga/read";
import { calcularClasificacion } from "@/src/server/laliga/clasificacion";
import type { Match } from "@/src/server/laliga/calendar";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET /api/fantasy/clasificacion — tabla de LaLiga con los resultados oficiales. */
export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;
  try {
    const actual = await getCurrentWeekPublic();
    const semanas = Array.from({ length: actual.weekNumber }, (_, i) => i + 1);
    const partidos: Match[] = [];
    for (let i = 0; i < semanas.length; i += 6) {
      const tanda = await Promise.all(semanas.slice(i, i + 6).map((w) => getCalendar(w).catch(() => [] as Match[])));
      partidos.push(...tanda.flat());
    }
    return privateJson({ jornada: actual.weekNumber, tabla: calcularClasificacion(partidos) });
  } catch (error) {
    return errorJson(error);
  }
}
