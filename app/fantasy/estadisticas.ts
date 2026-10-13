import type { Player, Position } from "./types";

/**
 * Rankings de todos los jugadores de LaLiga con los datos oficiales del
 * catálogo de LALIGA Fantasy: puntos, media, forma reciente y puntos por
 * millón de valor. Puro, para poder probarlo.
 */

export type OrdenEstadistica = "PUNTOS" | "MEDIA" | "FORMA" | "RENTABILIDAD" | "VALOR";

export type FilaEstadistica = {
  player: Player;
  /** Media de las últimas 3 jornadas con puntos publicados. `null` sin datos. */
  forma: number | null;
  /** Puntos de la temporada por cada millón de valor. */
  puntosPorMillon: number | null;
};

export function forma(player: Player, ultimas = 3): number | null {
  const jornadas = (player.weekPoints ?? []).slice().sort((a, b) => a.jornada - b.jornada).slice(-ultimas);
  if (jornadas.length === 0) return null;
  return jornadas.reduce((s, j) => s + j.puntos, 0) / jornadas.length;
}

export function filasDeEstadistica(players: Player[]): FilaEstadistica[] {
  return players.map((player) => ({
    player,
    forma: forma(player),
    puntosPorMillon: player.marketValue > 0 ? player.points / (player.marketValue / 1_000_000) : null,
  }));
}

export function ordenar(
  filas: FilaEstadistica[],
  { orden, posicion, equipo, busqueda, minimoJornadas = 0 }: { orden: OrdenEstadistica; posicion: "TODAS" | Position; equipo: string | null; busqueda: string; minimoJornadas?: number },
): FilaEstadistica[] {
  const q = busqueda.trim().toLowerCase();
  const clave = (f: FilaEstadistica): number => {
    if (orden === "PUNTOS") return f.player.points;
    if (orden === "MEDIA") return f.player.averagePoints;
    if (orden === "FORMA") return f.forma ?? -Infinity;
    if (orden === "RENTABILIDAD") return f.puntosPorMillon ?? -Infinity;
    return f.player.marketValue;
  };
  return filas
    .filter((f) => posicion === "TODAS" || f.player.position === posicion)
    .filter((f) => !equipo || f.player.team === equipo)
    .filter((f) => !q || `${f.player.name} ${f.player.team}`.toLowerCase().includes(q))
    .filter((f) => (f.player.weekPoints?.length ?? 0) >= minimoJornadas)
    .sort((a, b) => clave(b) - clave(a) || b.player.points - a.player.points);
}
