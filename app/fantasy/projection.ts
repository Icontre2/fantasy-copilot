import type { PlayerWithProbability } from "./types";
import type { DificultadDeEquipo } from "./difficulty";

/**
 * Predictor V1 de puntos esperados.
 *
 * No es un modelo entrenado todavía: es una predicción transparente que usa
 * señales que ya tenemos en la app. La BD guarda después predicción y resultado
 * para poder calibrarlo con datos reales jornada a jornada.
 */
export type Projection = {
  points: number;
  low: number;
  high: number;
  confidence: "Alta" | "Media" | "Baja";
  lineupProbability?: number;
  factors: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function projectPlayerPoints(
  player: PlayerWithProbability,
  dificultad?: DificultadDeEquipo,
): Projection | null {
  const historical = Number.isFinite(player.averagePoints) ? player.averagePoints : NaN;
  if (!Number.isFinite(historical) || historical < 0) return null;

  const recent = (player.weekPoints ?? [])
    .filter((entry) => Number.isFinite(entry.puntos))
    .slice(-4);
  const recentAverage = recent.length
    ? recent.reduce((sum, entry) => sum + entry.puntos, 0) / recent.length
    : null;

  // El histórico manda. La forma reciente solo corrige un poco la base.
  let conditional = recentAverage === null
    ? historical
    : historical * 0.85 + recentAverage * 0.15;

  const factors: string[] = [];

  if (recentAverage !== null) {
    if (recentAverage > historical + 1) factors.push("Forma reciente positiva");
    else if (recentAverage < historical - 1) factors.push("Forma reciente negativa");
  }

  // Contexto local: ajuste deliberadamente pequeño para que no domine al jugador.
  if (dificultad) {
    conditional *= dificultad.enCasa ? 1.05 : 0.97;
    factors.push(dificultad.enCasa ? "Juega en casa" : "Juega fuera");

    // La probabilidad de victoria representa el contexto del partido, no una
    // probabilidad directa de puntos. Por eso el ajuste queda limitado a ±10%.
    const winAdjustment = 0.90 + clamp(dificultad.probabilidadGanar, 0, 1) * 0.20;
    conditional *= winAdjustment;

    if (dificultad.probabilidadGanar >= 0.60) factors.push("Contexto favorable");
    else if (dificultad.probabilidadGanar <= 0.40) factors.push("Contexto desfavorable");
    else factors.push("Partido equilibrado");
  }

  const lineupProbability = player.lineupProbability;
  let expected = conditional;

  if (lineupProbability !== undefined) {
    const p = clamp(lineupProbability, 0, 100) / 100;
    // Los puntos esperados deben descontar el riesgo de no jugar.
    expected *= p;
    factors.push(
      lineupProbability >= 80
        ? "Titularidad probable alta"
        : lineupProbability >= 50
          ? "Titularidad con dudas"
          : "Riesgo alto de no jugar",
    );
  } else if (player.lineupExpectedStarter) {
    factors.push("Titular probable");
  } else {
    factors.push("Titularidad desconocida");
  }

  const points = Math.max(0, Math.round(expected * 10) / 10);

  // Rango orientativo. No pretende ser un intervalo estadístico hasta que
  // tengamos suficientes predicciones reales para estimar el error por posición.
  const uncertainty = lineupProbability === undefined
    ? 0.30
    : lineupProbability >= 80 ? 0.22 : lineupProbability >= 50 ? 0.32 : 0.45;
  const spread = Math.max(1, points * uncertainty);
  const low = Math.max(0, Math.round((points - spread) * 10) / 10);
  const high = Math.max(low, Math.round((points + spread) * 10) / 10);

  const confidence: Projection["confidence"] =
    lineupProbability !== undefined && lineupProbability >= 80 && recent.length >= 4
      ? "Alta"
      : lineupProbability !== undefined && lineupProbability >= 50 && recent.length >= 2
        ? "Media"
        : "Baja";

  return { points, low, high, confidence, lineupProbability, factors };
}
