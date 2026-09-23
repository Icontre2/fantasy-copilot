import { FORMATIONS } from "../../src/server/laliga/lineup.ts";
import { projectPlayerPoints, type Projection } from "./projection.ts";
import type { DificultadDeEquipo } from "./difficulty";
import type { PlayerWithProbability } from "./types";

/**
 * Predicción de la jornada para TU plantilla: cuántos puntos ≈ hará tu once y
 * qué once suma más.
 *
 * El modelo por jugador ya existía (`projection.ts`: media, forma reciente,
 * casa/fuera, cuotas del partido y probabilidad de titular); aquí se suma para
 * la plantilla y se elige, dentro de las formaciones que permite el juego, el
 * once con más puntos esperados.
 *
 * Es una estimación y se presenta como tal (≈ y rango). No toca tu alineación
 * oficial: eso se cambia en LALIGA Fantasy.
 */

export type JugadorPredicho = { player: PlayerWithProbability; proyeccion: Projection | null };

export type Once = {
  formacion: string;
  titulares: JugadorPredicho[];
  suplentes: JugadorPredicho[];
  total: number;
  bajo: number;
  alto: number;
  /** Titulares sin media publicada: cuentan 0 y se dice. */
  sinDatos: number;
};

const puntos = (j: JugadorPredicho) => j.proyeccion?.points ?? 0;
const redondear = (n: number) => Math.round(n * 10) / 10;

export function predecirJugadores(players: PlayerWithProbability[], dificultad: Record<string, DificultadDeEquipo> | null): JugadorPredicho[] {
  return players.map((player) => ({
    player,
    proyeccion: projectPlayerPoints(player, player.teamId && dificultad ? dificultad[player.teamId] : undefined),
  }));
}

function resumir(formacion: string, titulares: JugadorPredicho[], todos: JugadorPredicho[]): Once {
  const ids = new Set(titulares.map((j) => j.player.id));
  return {
    formacion,
    titulares,
    suplentes: todos.filter((j) => !ids.has(j.player.id)).sort((a, b) => puntos(b) - puntos(a)),
    total: redondear(titulares.reduce((s, j) => s + puntos(j), 0)),
    bajo: redondear(titulares.reduce((s, j) => s + (j.proyeccion?.low ?? 0), 0)),
    alto: redondear(titulares.reduce((s, j) => s + (j.proyeccion?.high ?? 0), 0)),
    sinDatos: titulares.filter((j) => j.proyeccion === null).length,
  };
}

/** El once con más puntos esperados entre las formaciones válidas. `null` si la plantilla no llena ninguna. */
export function onceOptimo(predichos: JugadorPredicho[]): Once | null {
  let mejor: Once | null = null;
  for (const f of FORMATIONS) {
    const titulares = (Object.keys(f) as Array<keyof typeof f>).flatMap((pos) =>
      predichos.filter((j) => j.player.position === pos).sort((a, b) => puntos(b) - puntos(a)).slice(0, f[pos]),
    );
    if (titulares.length !== 11) continue;
    const once = resumir(`${f.DEF}-${f.MED}-${f.DEL}`, titulares, predichos);
    if (!mejor || once.total > mejor.total) mejor = once;
  }
  return mejor;
}

/** El once que ya enseña la app (el más probable por titularidad), con su predicción. */
export function onceDado(formacion: string, titularesIds: string[], predichos: JugadorPredicho[]): Once {
  const ids = new Set(titularesIds);
  return resumir(formacion, predichos.filter((j) => ids.has(j.player.id)), predichos);
}

export type Cambio = { entra: JugadorPredicho; sale: JugadorPredicho | null };

/**
 * Qué cambia del once probable al óptimo, emparejando por posición: el que
 * entra con el que sale de su misma línea cuando lo hay. Si el óptimo usa otra
 * formación, puede entrar un jugador sin nadie de su línea que salga.
 */
export function cambiosSugeridos(actual: Once, optimo: Once): Cambio[] {
  const enActual = new Set(actual.titulares.map((j) => j.player.id));
  const enOptimo = new Set(optimo.titulares.map((j) => j.player.id));
  const entran = optimo.titulares.filter((j) => !enActual.has(j.player.id)).sort((a, b) => puntos(b) - puntos(a));
  const salen = actual.titulares.filter((j) => !enOptimo.has(j.player.id)).sort((a, b) => puntos(a) - puntos(b));
  const usados = new Set<string>();
  return entran.map((entra) => {
    const sale = salen.find((j) => !usados.has(j.player.id) && j.player.position === entra.player.position)
      ?? salen.find((j) => !usados.has(j.player.id))
      ?? null;
    if (sale) usados.add(sale.player.id);
    return { entra, sale };
  });
}
