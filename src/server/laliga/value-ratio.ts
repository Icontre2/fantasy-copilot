/**
 * Puntos por millón: cuánto ha puntuado un jugador por cada millón que vale hoy.
 *
 * CÁLCULO NUESTRO, y aritmética pura: puntos de la temporada ÷ valor en millones.
 * No es una recomendación de fichaje. Un jugador barato con pocos minutos puede
 * salir arriba por casualidad, y por eso se devuelve también con cuántos se le
 * compara: el puesto sin el «de cuántos» engaña.
 *
 * Solo se compara dentro de su posición, porque un portero y un delantero
 * puntúan por cosas distintas.
 */

export type JugadorComparable = {
  id: string;
  position: string;
  marketValue: number;
  points: number;
  status: string;
};

export type Rentabilidad = {
  puntosPorMillon: number;
  /** 1 = el que más puntos por millón tiene de su posición. */
  puesto: number;
  /** Jugadores de su posición que entran en la comparación. */
  de: number;
};

function ratio(jugador: JugadorComparable): number {
  return jugador.points / (jugador.marketValue / 1_000_000);
}

/** Entra quien sigue en la liga y tiene un valor publicado. */
function comparable(jugador: JugadorComparable): boolean {
  return jugador.status !== 'out_of_league' && jugador.marketValue > 0;
}

/**
 * `null` si el jugador no está en el catálogo o no tiene valor: sin valor no hay
 * división posible, y un cero ahí se leería como «no rinde nada».
 */
export function rentabilidad(playerId: string, catalogo: JugadorComparable[]): Rentabilidad | null {
  const jugador = catalogo.find((candidato) => candidato.id === playerId);
  if (!jugador || !comparable(jugador)) return null;

  const propio = ratio(jugador);
  const rivales = catalogo.filter(
    (candidato) => candidato.position === jugador.position && comparable(candidato),
  );
  const mejores = rivales.filter((candidato) => ratio(candidato) > propio).length;
  return { puntosPorMillon: propio, puesto: mejores + 1, de: rivales.length };
}
