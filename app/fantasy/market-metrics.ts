/**
 * Dos cuentas del mercado. Aritmética pura sobre datos oficiales: ni previsión
 * ni consejo, y por eso se rotulan como cálculo en la pantalla.
 */

/**
 * Puntos de la temporada por cada millón que vale hoy. `null` sin valor
 * publicado: dividir por cero no da «0 puntos por millón», da «no se sabe».
 */
export function puntosPorMillon(points: number, marketValue: number): number | null {
  if (!Number.isFinite(marketValue) || marketValue <= 0 || !Number.isFinite(points)) return null;
  return points / (marketValue / 1_000_000);
}

/**
 * Cuánto se separa el precio de salida de su valor de mercado: +0,12 = un 12 %
 * por encima. `null` sin valor con el que comparar.
 */
export function salidaSobreValor(salePrice: number, marketValue: number): number | null {
  if (!Number.isFinite(marketValue) || marketValue <= 0 || !Number.isFinite(salePrice)) return null;
  return salePrice / marketValue - 1;
}
