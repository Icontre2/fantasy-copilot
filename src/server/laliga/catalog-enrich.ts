/**
 * Rellenar los huecos de la plantilla con el catalogo de la temporada.
 *
 * LALIGA devuelve las plantillas de una liga con menos datos por jugador que su
 * catalogo: segun el endpoint puede faltar el equipo, y con el equipo se cae la
 * probabilidad de titularidad —que se busca por club— y la foto. En pantalla
 * eso se veia como "DEF · —" y un circulo gris.
 *
 * Esto NO inventa nada: coge el dato que la propia LALIGA publica para ese mismo
 * jugador en su catalogo, y solo donde falta. Lo que ya venia en la plantilla
 * manda siempre, porque es lo especifico de tu liga.
 *
 * ── Por que ahora si y antes no ─────────────────────────────────────────────
 * Mientras el catalogo se leia del host `api-fantasy`, iba una temporada por
 * detras: su equipo podia ser el club del año pasado y escribirlo en la ficha
 * habria sido una mentira visible. Desde que se lee del host de la temporada en
 * curso, es el mismo dato de hoy y se puede usar sin reparos.
 */

type Enriquecible = {
  id: string;
  team: string;
  teamId?: string;
  image?: string;
  weekPoints?: { jornada: number; puntos: number }[];
};

/** Lo que el catalogo sabe de un jugador y puede prestar. */
export type DatosDeCatalogo = {
  team: string;
  teamId?: string;
  image?: string;
  weekPoints?: { jornada: number; puntos: number }[];
};

/** `—` es el marcador de "no lo sé" de esta app, no un nombre de equipo. */
const SIN_DATO = '—';

export function construirIndice(catalogo: Enriquecible[]): Map<string, DatosDeCatalogo> {
  return new Map(
    catalogo.map((player) => [
      player.id,
      { team: player.team, teamId: player.teamId, image: player.image, weekPoints: player.weekPoints },
    ]),
  );
}

/**
 * Devuelve el jugador con los huecos rellenos. Si no falta nada, devuelve el
 * mismo objeto: no se crean copias por gusto.
 */
export function enriquecerJugador<T extends Enriquecible>(
  player: T,
  indice: Map<string, DatosDeCatalogo>,
): T {
  const faltaEquipo = player.teamId === undefined || player.team === SIN_DATO || player.team === '';
  const faltaFoto = !player.image;
  // Los puntos por jornada NO vienen en la plantilla: son siempre del catalogo.
  const faltaRacha = player.weekPoints === undefined;
  if (!faltaEquipo && !faltaFoto && !faltaRacha) return player;

  const delCatalogo = indice.get(player.id);
  if (!delCatalogo) return player;

  const enriquecido = { ...player };
  if (player.teamId === undefined && delCatalogo.teamId !== undefined) {
    enriquecido.teamId = delCatalogo.teamId;
  }
  if (faltaEquipo && delCatalogo.team && delCatalogo.team !== SIN_DATO) {
    enriquecido.team = delCatalogo.team;
  }
  if (faltaFoto && delCatalogo.image) {
    enriquecido.image = delCatalogo.image;
  }
  if (faltaRacha && delCatalogo.weekPoints !== undefined) {
    enriquecido.weekPoints = delCatalogo.weekPoints;
  }
  return enriquecido;
}

export function enriquecerJugadores<T extends Enriquecible>(
  players: T[],
  indice: Map<string, DatosDeCatalogo>,
): T[] {
  return players.map((player) => enriquecerJugador(player, indice));
}
