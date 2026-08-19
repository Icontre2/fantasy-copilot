import type { PlayerWithProbability } from "./types";

/**
 * Qué jornadas se pueden mirar en una plantilla.
 *
 * Sale de los datos, no de un contador del 1 al 38: LALIGA solo publica
 * `weekPoints` de las jornadas cerradas, así que ofrecer «J12» cuando vamos por
 * la segunda sería ofrecer una pantalla vacía y dejar al lector pensando que
 * sus jugadores no puntuaron.
 *
 * La jornada en curso entra aunque todavía no haya puntuado nadie: es
 * exactamente la que se quiere mirar mientras se juega, y ahí el «—» sí
 * significa algo («aún no hay nada publicado»).
 */
export function jornadasDisponibles(
  players: PlayerWithProbability[],
  currentWeek: number | null,
): number[] {
  const jornadas = new Set<number>();
  for (const player of players) {
    for (const entrada of player.weekPoints ?? []) jornadas.add(entrada.jornada);
  }
  if (currentWeek !== null) jornadas.add(currentWeek);
  return [...jornadas].sort((a, b) => a - b);
}

/** Puntos de ese jugador en esa jornada, o `null` si no consta. */
export function puntosEnJornada(player: PlayerWithProbability, jornada: number): number | null {
  return player.weekPoints?.find((entrada) => entrada.jornada === jornada)?.puntos ?? null;
}

/**
 * Los puntos de un once en una jornada.
 *
 * `total` suma SOLO a quien ya tiene puntuación publicada. Un jugador sin dato
 * no suma cero: no suma. Por eso se devuelve también `conDato`, que es lo que
 * permite distinguir un once que hizo 0 puntos de un once del que todavía no se
 * sabe nada.
 */
export function puntosDelOnce(players: PlayerWithProbability[], jornada: number) {
  const puntuados = players.flatMap((player) => {
    const puntos = puntosEnJornada(player, jornada);
    return puntos === null ? [] : [puntos];
  });
  return {
    total: puntuados.reduce((suma, puntos) => suma + puntos, 0),
    conDato: puntuados.length,
    de: players.length,
  };
}
