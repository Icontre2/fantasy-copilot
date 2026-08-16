import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { buildTeamLineup } from "@/src/server/laliga/probable-lineup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/fantasy/leagues/{leagueId}/teams/{teamId}/lineup
 *
 * Once más probable de un participante de la liga.
 *
 * Se pide de uno en uno a propósito. Cada manager tiene jugadores de unos doce
 * clubes distintos, así que calcular los ocho de golpe obligaría a descargar las
 * veinte alineaciones antes de poder enseñar nada. Así solo se paga por el
 * manager que se abre, y lo ya descargado lo comparten todos.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; teamId: string }> },
) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId, teamId } = await params;

  try {
    const lineup = await buildTeamLineup(auth.token, leagueId, teamId);
    if (!lineup) {
      return privateJson({ error: "Ese equipo no está en esta liga." }, 404);
    }
    return privateJson({
      ...lineup,
      dataNotes: [
        "El once sale de los porcentajes y titulares que publica FútbolFantasy, colocados en una formación válida.",
        "No es la alineación que ha puesto ese manager: LALIGA no publica las alineaciones ajenas.",
      ],
    });
  } catch (error) {
    return errorJson(error);
  }
}
