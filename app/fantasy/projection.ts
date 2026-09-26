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

/**
 * Estados de LALIGA con los que un jugador no va a jugar la jornada.
 *
 * Antes no se miraban: si FútbolFantasy no publicaba su probabilidad, un
 * lesionado contaba como titular con su media entera, y el «mejor once» lo
 * metía en el campo. Ahora cuenta cero, y se dice por qué.
 */
const NO_JUEGA: Partial<Record<string, string>> = {
  injured: "Lesionado",
  suspended: "Sancionado",
  out_of_league: "Fuera de la liga",
};

/** Si no hay probabilidad publicada, «en duda» se toma como media probabilidad. */
const FACTOR_DUDA_SIN_PROBABILIDAD = 0.5;

export function projectPlayerPoints(
  player: PlayerWithProbability,
  dificultad?: DificultadDeEquipo,
): Projection | null {
  const historical = Number.isFinite(player.averagePoints) ? player.averagePoints : NaN;
  if (!Number.isFinite(historical) || historical < 0) return null;

  const motivo = NO_JUEGA[player.status];
  if (motivo) {
    return { points: 0, low: 0, high: 0, confidence: "Alta", lineupProbability: player.lineupProbability, factors: [motivo] };
  }

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
  const enDuda = player.status === "doubtful";
  if (enDuda) factors.push("En duda");

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
    if (enDuda) expected *= FACTOR_DUDA_SIN_PROBABILIDAD;
  } else {
    factors.push("Titularidad desconocida");
    if (enDuda) expected *= FACTOR_DUDA_SIN_PROBABILIDAD;
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
