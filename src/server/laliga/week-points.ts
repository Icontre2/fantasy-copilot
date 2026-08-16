/**
 * Puntos por jornada de un jugador: los de la jornada en curso y su racha.
 *
 * ── El problema honesto de este modulo ──────────────────────────────────────
 * LALIGA publica `weekPoints` en el catalogo de la temporada, pero HOY llega
 * como lista vacia en los 731 jugadores: no se ha cerrado ninguna jornada. Eso
 * significa que no se puede ver la forma real de cada entrada.
 *
 * Ante eso caben dos actitudes. Una es inventarse la estructura y confiar; la
 * otra, la de este proyecto, es leer lo que se reconozca y callar lo que no. Por
 * eso el lector acepta los nombres de campo que puede tener una jornada
 * —`weekNumber`/`week` y `totalPoints`/`points`— y DESCARTA lo que no encaje,
 * en vez de asumir posiciones o rellenar con ceros.
 *
 * Consecuencia buscada: mientras la lista este vacia, la interfaz dira que
 * todavia no hay jornadas jugadas. El dia que LALIGA la rellene, aparecera sola
 * si el formato es alguno de los reconocidos; y si no lo es, seguira diciendo
 * que no lo sabe en vez de enseñar un cero que nadie ha marcado.
 */

export type JornadaPuntos = {
  jornada: number;
  puntos: number;
};

function numero(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string' && valor.trim() !== '' && Number.isFinite(Number(valor))) {
    return Number(valor);
  }
  return null;
}

/** Una entrada suelta, si se puede leer. `null` si no se reconoce. */
export function leerJornada(entrada: unknown): JornadaPuntos | null {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return null;
  const campos = entrada as Record<string, unknown>;
  const jornada = numero(campos.weekNumber) ?? numero(campos.week);
  const puntos = numero(campos.totalPoints) ?? numero(campos.points);
  if (jornada === null || puntos === null) return null;
  return { jornada, puntos };
}

/** Las jornadas legibles, ordenadas de la mas antigua a la mas reciente. */
export function leerJornadas(crudo: unknown): JornadaPuntos[] {
  if (!Array.isArray(crudo)) return [];
  return crudo
    .map(leerJornada)
    .filter((entrada): entrada is JornadaPuntos => entrada !== null)
    .sort((a, b) => a.jornada - b.jornada);
}

/**
 * Puntos de una jornada concreta.
 *
 * `null` cuando esa jornada no consta, que NO es lo mismo que cero puntos: un
 * jugador que no ha jugado y un jugador que hizo cero se leen distinto.
 */
export function puntosDeJornada(jornadas: JornadaPuntos[], jornada: number): number | null {
  return jornadas.find((entrada) => entrada.jornada === jornada)?.puntos ?? null;
}

/** Las ultimas `cuantas` jornadas jugadas: la racha reciente. */
export function ultimasJornadas(jornadas: JornadaPuntos[], cuantas = 5): JornadaPuntos[] {
  return jornadas.slice(-cuantas);
}
