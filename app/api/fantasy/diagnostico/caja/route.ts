import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getLeagueSnapshot, getMyLeagues, getMyProfile } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";

/**
 * GET /api/fantasy/diagnostico/caja
 *
 * ¿Publica LALIGA el `teamMoney` de los DEMÁS managers, o solo el tuyo?
 *
 * La documentación del proyecto de referencia daba por hecho que sí, y toda la
 * pantalla de Economía se apoya en ello: el saldo de cada manager se LEE, no se
 * calcula. Si resulta que la API solo publica el propio, esa premisa se cae y
 * hay que decirlo en la interfaz en vez de enseñar huecos sin explicación.
 *
 * Responde con un recuento por manager de si el dato llega o no. Son datos de
 * tu propia liga, que ya ves en la pantalla de Liga.
 */
export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  try {
    const [me, leagues] = await Promise.all([
      getMyProfile(auth.token),
      getMyLeagues(auth.token),
    ]);
    const league = leagues[0];
    if (!league) return privateJson({ error: "Tu cuenta no tiene ninguna liga." }, 404);

    const snapshot = await getLeagueSnapshot(auth.token, league.id);

    const managers = snapshot.teams.map((team) => ({
      manager: team.manager.name,
      soyYo: team.manager.id === me.id,
      caja: team.teamMoney ?? null,
      cajaLlega: team.teamMoney !== undefined && team.teamMoney !== null,
      valorPlantilla: team.teamValue ?? null,
      jugadores: team.players.length,
    }));

    const conCaja = managers.filter((m) => m.cajaLlega).length;
    const rivalesConCaja = managers.filter((m) => !m.soyYo && m.cajaLlega).length;
    const rivales = managers.filter((m) => !m.soyYo).length;

    return privateJson({
      liga: league.name,
      veredicto:
        rivales === 0
          ? "Solo estas tu en la liga: no se puede comprobar."
          : rivalesConCaja === rivales
            ? "LALIGA SI publica la caja de todos los managers."
            : rivalesConCaja === 0
              ? "LALIGA NO publica la caja de los rivales, solo la tuya. La pantalla de Economia no puede leer su saldo."
              : `LALIGA publica la caja de ${rivalesConCaja} de ${rivales} rivales. Dato parcial.`,
      managersTotales: managers.length,
      conCaja,
      equiposQueFallaron: snapshot.failedTeamIds.length,
      managers,
    });
  } catch (error) {
    return errorJson(error);
  }
}
