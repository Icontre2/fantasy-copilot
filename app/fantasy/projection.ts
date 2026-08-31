import type { PlayerWithProbability } from "./types";
import type { DificultadDeEquipo } from "./difficulty";

/**
 * Proyección V1 de puntos esperados.
 *
 * Está inspirada en las señales del análisis de Analítica Fantasy, pero NO se
 * presenta como un modelo entrenado: es una heurística transparente hasta que
 * podamos medir el error jornada a jornada con nuestros propios datos.
 *
 * Prioridad de señales:
 * 1) rendimiento histórico del jugador
 * 2) una pequeña corrección por forma reciente
 * 3) contexto casa/fuera
 * 4) fortaleza del rival a través de la probabilidad de victoria del equipo
 * 5) probabilidad de ser titular, que convierte la proyección en puntos esperados
 */
export type Projection = {
  points: number;
  confidence: "Alta" | "Media" | "Baja";
  lineupProbability?: number;
};

export function projectPlayerPoints(
  player: PlayerWithProbability,
  dificultad?: DificultadDeEquipo,
): Projection | null {
  const base = Number.isFinite(player.averagePoints) ? player.averagePoints : NaN;
  if (!Number.isFinite(base) || base < 0) return null;

  const recent = player.weekPoints?.filter((entry) => Number.isFinite(entry.puntos)).slice(-4) ?? [];
  const recentAverage = recent.length > 0
    ? recent.reduce((sum, entry) => sum + entry.puntos, 0) / recent.length
    : null;

  // La forma reciente tiene poco peso: el análisis muestra que por sí sola
  // explica poco de la siguiente jornada.
  let conditional = recentAverage === null ? base : base * 0.85 + recentAverage * 0.15;

  // Efecto moderado de casa/fuera; nunca domina al rendimiento individual.
  if (dificultad) conditional *= dificultad.enCasa ? 1.05 : 0.97;

  // Contexto del partido: la probabilidad de ganar del equipo actúa como una
  // corrección suave alrededor de 50%, no como un multiplicador agresivo.
  if (dificultad) conditional *= 0.9 + dificultad.probabilidadGanar * 0.2;

  const lineupProbability = player.lineupProbability;
  // Si no conocemos la probabilidad de titularidad no inventamos un porcentaje:
  // devolvemos una proyección condicional y la marcamos con confianza baja.
  const expected = lineupProbability === undefined
    ? conditional
    : conditional * Math.max(0, Math.min(1, lineupProbability / 100));

  const confidence: Projection["confidence"] =
    lineupProbability === undefined || recent.length < 2
      ? "Baja"
      : lineupProbability >= 80 && recent.length >= 4
        ? "Alta"
        : "Media";

  return {
    points: Math.max(0, Math.round(expected * 10) / 10),
    confidence,
    lineupProbability,
  };
}
