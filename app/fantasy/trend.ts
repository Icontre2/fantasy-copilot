/**
 * El lenguaje visual de una tendencia: el color, el tono de fondo, la línea y
 * la fecha corta.
 *
 * Vive aparte porque lo usan cuatro sitios —tu resumen, tu plantilla, la ficha
 * de un rival y cada jugador de una lista— y hasta ahora cada uno lo resolvía
 * por su cuenta: dos sparklines con la misma fórmula escrita dos veces, el par
 * verde/rojo copiado en tres archivos y tres maneras distintas de escribir
 * «12 ago». Cuando el mismo dato se dibuja de tres formas deja de poder
 * compararse de un vistazo, que es exactamente para lo que sirve una tendencia.
 */

/** Sube, baja, o no se sabe. Un solo sitio donde cambiarlos. */
export const COLOR_SUBE = "#34d399";
export const COLOR_BAJA = "#fb7185";
export const COLOR_SIN_DATO = "#a1a1aa";

/** Color de la línea. Sin dato y plano comparten gris: ninguno es una subida. */
export function trendColor(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || delta === 0) return COLOR_SIN_DATO;
  return delta > 0 ? COLOR_SUBE : COLOR_BAJA;
}

/** Fondo + texto de una etiqueta, con el mismo criterio que `trendColor`. */
export function trendTone(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || delta === 0) return "bg-white/[.06] text-neutral-400";
  return delta > 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400";
}

/** Alto útil de la sparkline dentro de un `viewBox` de 24, con aire arriba y abajo. */
const SUELO = 21;
const ALTO = 18;

/**
 * Los puntos de una sparkline en un `viewBox="0 0 100 24"`.
 *
 * Cadena vacía con menos de dos valores: una línea necesita dos extremos, y
 * dibujar un punto suelto sugeriría una serie que no existe. Quien llama decide
 * qué poner en ese hueco, porque el motivo cambia según la pantalla.
 */
export function sparklinePoints(values: number[]): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const span = Math.max(Math.max(...values) - min, 1);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = SUELO - ((value - min) / span) * ALTO;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** «12 ago». La fecha corta de todas las gráficas. */
export function dayMonth(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}
