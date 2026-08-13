/**
 * Ingreso economico por puntos Fantasy.
 *
 * Regla del producto: **100.000 EUR por cada punto conseguido**.
 * 250 puntos = 25.000.000 EUR.
 *
 * ── Como se evita contar dos veces (lo importante de este fichero) ───────────
 * La proteccion NO consiste en acordarse de no sumar. Consiste en que aqui
 * nunca se suma nada: se ESCRIBE un valor absoluto.
 *
 * LALIGA publica `teamPoints`, que es el ACUMULADO de la temporada de ese
 * manager. Lo que se guarda por jornada es el reparto de ese acumulado:
 *
 *     puntos_de_la_jornada_N = teamPoints_observado - Σ puntos ya atribuidos a jornadas < N
 *
 * y la fila se escribe con UPSERT sobre `(league_id, manager_id, matchday)`.
 * De ahi salen las dos propiedades que pedia el encargo:
 *
 *  - **Determinista**: dos sincronizaciones con la misma observacion producen
 *    exactamente la misma fila, no una fila el doble de grande.
 *  - **Acumulativo y sin duplicados**: por construccion,
 *    `Σ puntos de todas las jornadas == teamPoints`. Sincronizar cien veces
 *    seguidas deja el total igual que sincronizar una.
 *
 * Un incremento (`amount += ...`) tendria que acertar cuantas veces se ha
 * ejecutado; un valor absoluto no tiene que acordarse de nada.
 */

/** Euros que genera cada punto Fantasy. */
export const EUROS_PER_POINT = 100_000;

export type PointIncomeRow = {
  leagueId: string;
  managerId: string;
  matchday: number;
  /** Puntos atribuidos a ESTA jornada. */
  points: number;
  /** `points * EUROS_PER_POINT`. */
  amount: number;
};

export type RecordedPoints = { matchday: number; points: number };

/**
 * Reparte el acumulado observado (`totalPoints`) en la jornada indicada,
 * descontando lo ya atribuido a jornadas anteriores.
 *
 * `previouslyRecorded` puede incluir la propia `matchday` (es lo normal al
 * re-sincronizar dentro de la misma jornada): se ignora, porque esa fila es
 * justamente la que se va a reescribir.
 *
 * El resultado puede ser negativo si LALIGA corrige puntos a la baja. Se deja
 * pasar a proposito: recortarlo a cero romperia la invariante
 * `Σ puntos == teamPoints` y el saldo dejaria de cuadrar con la API.
 */
export function attributePoints(input: {
  leagueId: string;
  managerId: string;
  matchday: number;
  totalPoints: number;
  previouslyRecorded: RecordedPoints[];
}): PointIncomeRow {
  const earlier = input.previouslyRecorded
    .filter((row) => row.matchday < input.matchday)
    .reduce((sum, row) => sum + row.points, 0);

  const points = input.totalPoints - earlier;

  return {
    leagueId: input.leagueId,
    managerId: input.managerId,
    matchday: input.matchday,
    points,
    amount: points * EUROS_PER_POINT,
  };
}

/** Ingreso total por puntos de un manager, sumando sus jornadas registradas. */
export function totalPointIncome(rows: PointIncomeRow[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}
