import { errorJson, privateJson } from '@/src/server/http/responses';
import { requireSession } from '@/src/server/http/session-guard';
import { getCurrentWeekPublic, getTeamFixtures } from '@/src/server/laliga/read';

export const dynamic = 'force-dynamic';

/** Jornada en curso y las cuatro siguientes. */
const JORNADAS = 5;

/**
 * GET /api/fantasy/teams/{teamId}/fixtures
 *
 * Calendario de un equipo real desde la jornada en curso. Datos públicos de
 * LALIGA; la ruta pide sesión igualmente, como todas (ver `calendar/route.ts`).
 */
export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const auth = await requireSession(request);
  if ('response' in auth) return auth.response;
  const { teamId } = await params;
  if (!/^\d{1,6}$/.test(teamId)) return privateJson({ error: 'Equipo no válido.' }, 400);
  try {
    const actual = await getCurrentWeekPublic();
    const partidos = await getTeamFixtures(teamId, actual.weekNumber, JORNADAS);
    return privateJson({ currentWeek: actual.weekNumber, partidos });
  } catch (error) {
    return errorJson(error);
  }
}
