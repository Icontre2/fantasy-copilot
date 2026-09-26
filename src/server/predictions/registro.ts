/**
 * Registro de predicciones: lo que el predictor dijo ANTES de la jornada, y
 * cuánto acertó cuando terminó.
 *
 * Sin esto el predictor era un número al que había que creer. Con esto se ve
 * si se equivoca, en qué sentido y cuánto — que es lo único que permite fiarse
 * de él o no.
 *
 * ── Las dos reglas que lo hacen honesto ─────────────────────────────────────
 * 1. Se CONGELA al empezar la jornada: a partir del primer partido ya no se
 *    guarda nada nuevo. Si no, una predicción hecha el domingo por la noche
 *    «acertaría» porque ya sabe medio resultado.
 * 2. Se compara con los puntos reales de ESOS MISMOS jugadores — no con lo que
 *    hiciste tú, que depende de a quién alineaste de verdad. Lo que se mide es
 *    el predictor, no tus decisiones.
 *
 * Puro: sin red ni base de datos, para poder probarlo.
 */

export type JugadorRegistrado = { id: string; name: string; puntos: number };

export type PrediccionRegistrada = {
  jornada: number;
  formacion: string;
  total: number;
  jugadores: JugadorRegistrado[];
};

export type Evaluacion = {
  jornada: number;
  previsto: number;
  real: number;
  /** `real − previsto`: positivo = el once hizo más de lo previsto. */
  error: number;
};

const MAX_JUGADORES = 11;

/** Valida lo que manda el navegador. `null` si no es una predicción legible. */
export function leerPrediccion(cuerpo: unknown): PrediccionRegistrada | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const c = cuerpo as Record<string, unknown>;
  const jornada = Number(c.jornada);
  const total = Number(c.total);
  if (!Number.isInteger(jornada) || jornada < 1 || jornada > 60) return null;
  if (!Number.isFinite(total) || total < 0 || total > 500) return null;
  if (typeof c.formacion !== 'string' || c.formacion.length === 0 || c.formacion.length > 12) return null;
  if (!Array.isArray(c.jugadores) || c.jugadores.length === 0 || c.jugadores.length > MAX_JUGADORES) return null;

  const jugadores: JugadorRegistrado[] = [];
  for (const j of c.jugadores) {
    if (!j || typeof j !== 'object') return null;
    const { id, name, puntos } = j as Record<string, unknown>;
    if (typeof id !== 'string' || !id || id.length > 32) return null;
    if (typeof name !== 'string' || name.length > 80) return null;
    const p = Number(puntos);
    if (!Number.isFinite(p) || p < 0 || p > 100) return null;
    jugadores.push({ id, name, puntos: Math.round(p * 10) / 10 });
  }
  return { jornada, formacion: c.formacion, total: Math.round(total * 10) / 10, jugadores };
}

/** ¿Ha empezado ya la jornada? Sí en cuanto el primer partido tiene hora pasada. */
export function jornadaEmpezada(kickoffs: string[], ahora: Date): boolean {
  const horas = kickoffs.map((k) => Date.parse(k)).filter((t) => !Number.isNaN(t));
  if (horas.length === 0) return false;
  return Math.min(...horas) <= ahora.getTime();
}

/**
 * Cuánto sacaron de verdad los jugadores de una predicción.
 *
 * Solo se llama con jornadas TERMINADAS. Ahí un jugador sin puntos publicados
 * no jugó, y en Fantasy no jugar son cero puntos: se cuenta cero.
 */
export function evaluar(
  prediccion: Pick<PrediccionRegistrada, 'jornada' | 'total' | 'jugadores'>,
  puntosReales: (playerId: string, jornada: number) => number | null,
): Evaluacion {
  const real = prediccion.jugadores.reduce((suma, j) => suma + (puntosReales(j.id, prediccion.jornada) ?? 0), 0);
  return {
    jornada: prediccion.jornada,
    previsto: prediccion.total,
    real,
    error: Math.round((real - prediccion.total) * 10) / 10,
  };
}

/** Error medio absoluto: «se equivoca en ±X puntos de media». */
export function errorMedio(evaluaciones: Evaluacion[]): number | null {
  if (evaluaciones.length === 0) return null;
  const suma = evaluaciones.reduce((s, e) => s + Math.abs(e.error), 0);
  return Math.round((suma / evaluaciones.length) * 10) / 10;
}
