/**
 * Cuánto ha cambiado el valor de un jugador en los últimos N días.
 *
 * CÁLCULO NUESTRO sobre la serie diaria oficial: último valor menos el de hace N
 * días. Se busca por FECHA, no contando puntos hacia atrás, porque a la serie le
 * puede faltar algún día y entonces «7 puntos atrás» serían más de 7 días.
 *
 * `null` si la serie no llega tan atrás: decir «+0 %» de un jugador con tres días
 * de historia sería inventarse que no se ha movido.
 */

type Punto = { date: string; marketValue: number };

export type Variacion = { euros: number; porcentaje: number; desde: string };

const DIA_MS = 86_400_000;

export function variacion(serie: Punto[], dias: number): Variacion | null {
  const ultimo = serie.at(-1);
  if (!ultimo) return null;
  const limite = Date.parse(ultimo.date) - dias * DIA_MS;

  let base: Punto | undefined;
  for (const punto of serie) {
    if (Date.parse(punto.date) <= limite) base = punto;
    else break;
  }
  if (!base || base.marketValue <= 0) return null;

  const euros = ultimo.marketValue - base.marketValue;
  return { euros, porcentaje: euros / base.marketValue, desde: base.date };
}
