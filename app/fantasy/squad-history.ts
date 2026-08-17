import type { MarketValuePoint } from "./types";

export type HistoryRange = 7 | 14 | "AUG1";

/** El encargo fija explícitamente el comienzo de la comparación. */
export const SQUAD_HISTORY_START = "2026-08-01";

/**
 * Corta respecto al último dato real, no respecto al reloj del dispositivo.
 * Así una pausa de LALIGA no convierte una serie válida en una gráfica vacía.
 */
export function filterPlayerHistory(points: MarketValuePoint[], range: HistoryRange): MarketValuePoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  if (range === "AUG1" || sorted.length === 0) return sorted;
  const latest = Date.parse(sorted.at(-1)!.date);
  const cutoff = latest - (range - 1) * 86_400_000;
  return sorted.filter((point) => Date.parse(point.date) >= cutoff);
}

/**
 * Suma el valor oficial diario de los jugadores que HOY forman la plantilla.
 * Solo crea un punto cuando todos los históricos disponibles tienen valor para
 * esa fecha; nunca completa huecos con cero.
 */
export function aggregateCurrentSquad(histories: Record<string, MarketValuePoint[]>): MarketValuePoint[] {
  const series = Object.values(histories)
    .map((points) => [...points].sort((a, b) => a.date.localeCompare(b.date)))
    .filter((points) => points.length > 0);
  if (series.length === 0) return [];

  const dates = [...new Set(series.flatMap((points) => points.map((point) => point.date)))].sort();
  const indexes = series.map((points) => new Map(points.map((point) => [point.date, point.marketValue])));
  return dates.flatMap((date) => {
    const values = indexes.map((index) => index.get(date));
    let marketValue = 0;
    for (const value of values) {
      if (value === undefined) return [];
      marketValue += value;
    }
    return [{ date, marketValue }];
  });
}

export function historyDelta(points: MarketValuePoint[]): number | null {
  if (points.length < 2) return null;
  return points.at(-1)!.marketValue - points[0]!.marketValue;
}
