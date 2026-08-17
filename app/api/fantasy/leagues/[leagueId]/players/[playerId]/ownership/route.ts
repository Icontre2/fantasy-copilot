import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getLeagueSnapshot, getMyProfile } from "@/src/server/laliga/read";
import { propiedadDe } from "@/src/server/laliga/ownership";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/fantasy/leagues/{leagueId}/players/{playerId}/ownership
 *
 * De quién es este jugador y si se le puede pagar la cláusula.
 *
 * Existe para que la ficha del jugador pueda ofrecer el botón de pagar sin que
 * la pantalla que la abre tenga que saber nada: la ficha se abre desde seis
 * sitios distintos y no todos conocen al dueño ni la cláusula.
 *
 * Esto solo MIRA. El pago sigue estando en su propia ruta, que vuelve a
 * comprobarlo todo justo antes de mover el dinero: entre que se pinta este botón
 * y se pulsa pueden pasar minutos, y en ese rato la cláusula puede cambiar o el
 * jugador puede cambiar de dueño.
 */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string; playerId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;
  const { leagueId, playerId } = await params;

  try {
    const [snapshot, perfil] = await Promise.all([
      getLeagueSnapshot(auth.token, leagueId),
      getMyProfile(auth.token),
    ]);
    return privateJson(propiedadDe(snapshot.teams, playerId, perfil.id));
  } catch (error) {
    return errorJson(error);
  }
}
