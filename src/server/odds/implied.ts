/**
 * De cuotas a probabilidad, y de probabilidad a una frase.
 *
 * ── Lo que hay que entender de una cuota ────────────────────────────────────
 * Una cuota decimal de 2,00 NO significa "50 % de posibilidades". Significa que
 * la casa paga el doble, y en ese precio va metida su comisión. Si se suman las
 * tres probabilidades implícitas de un partido (1, X y 2) el total no da 100 %,
 * da 105 % o más: ese exceso es el margen del negocio.
 *
 * Por eso aquí se hacen dos cosas separadas y ambas se enseñan:
 *   1. la cuota TAL CUAL la publica la casa, que es el dato;
 *   2. la probabilidad ya sin margen, que es un cálculo nuestro y se etiqueta
 *      como tal.
 *
 * Quitar el margen es una división, no un modelo: cada probabilidad implícita
 * se divide entre la suma de las tres. Es la forma estándar y se puede repetir
 * a mano con una calculadora.
 *
 * Y lo que esto NUNCA es: un pronóstico de esta app. Es el precio al que una
 * casa de apuestas está dispuesta a pagar. Sirve para saber si el rival de tu
 * jugador es un hueso o un regalo, y para nada más.
 */

export type Resultado = 'local' | 'empate' | 'visitante';

export type CuotasPartido = {
  /** Cuota decimal tal cual la publica la casa. */
  local: number;
  empate: number;
  visitante: number;
};

export type Probabilidades = {
  local: number;
  empate: number;
  visitante: number;
  /**
   * Cuánto suman las probabilidades implícitas SIN corregir. 1.06 = la casa se
   * queda un 6 %. Se expone para poder juzgar si unas cuotas son competitivas.
   */
  margen: number;
};

/** Una cuota decimal válida es mayor que 1: pagar menos de lo apostado no existe. */
export function esCuotaValida(cuota: unknown): cuota is number {
  return typeof cuota === 'number' && Number.isFinite(cuota) && cuota > 1;
}

/**
 * Probabilidades de los tres resultados, ya sin el margen de la casa.
 *
 * `null` si alguna cuota no es válida: con dos de tres no se puede repartir el
 * margen, y publicar una probabilidad a medias sería peor que no publicarla.
 */
export function probabilidades(cuotas: CuotasPartido): Probabilidades | null {
  const { local, empate, visitante } = cuotas;
  if (!esCuotaValida(local) || !esCuotaValida(empate) || !esCuotaValida(visitante)) return null;

  const implicitas = { local: 1 / local, empate: 1 / empate, visitante: 1 / visitante };
  const margen = implicitas.local + implicitas.empate + implicitas.visitante;
  if (margen <= 0) return null;

  return {
    local: implicitas.local / margen,
    empate: implicitas.empate / margen,
    visitante: implicitas.visitante / margen,
    margen,
  };
}

/**
 * Qué tan difícil lo tiene un equipo, en palabras.
 *
 * Los cortes son redondos a propósito y están aquí a la vista para poder
 * discutirlos. El texto acompaña siempre al porcentaje; nunca lo sustituye, y
 * nunca va solo con un color.
 */
export function dificultad(probabilidadDeGanar: number): string {
  if (probabilidadDeGanar >= 0.6) return 'Muy favorable';
  if (probabilidadDeGanar >= 0.45) return 'Favorable';
  if (probabilidadDeGanar >= 0.3) return 'Igualado';
  if (probabilidadDeGanar >= 0.18) return 'Difícil';
  return 'Muy difícil';
}

/** Probabilidad de que gane el equipo pedido. */
export function probabilidadDe(probs: Probabilidades, quien: 'local' | 'visitante'): number {
  return quien === 'local' ? probs.local : probs.visitante;
}
