import assert from "node:assert/strict";
import test from "node:test";
import { aggregateCurrentSquad, filterPlayerHistory, historyDelta } from "./squad-history.ts";

const point = (date: string, marketValue: number) => ({ date, marketValue });

test("agrega únicamente fechas completas y nunca rellena un jugador con cero", () => {
  const result = aggregateCurrentSquad({
    a: [point("2026-08-01", 10), point("2026-08-02", 12)],
    b: [point("2026-08-02", 20), point("2026-08-03", 21)],
  });
  assert.deepEqual(result, [point("2026-08-02", 32)]);
});

test("el filtro corto toma como referencia el último dato real", () => {
  const history = Array.from({ length: 20 }, (_, index) => point(`2026-08-${String(index + 1).padStart(2, "0")}`, index));
  assert.equal(filterPlayerHistory(history, 7).length, 7);
  assert.equal(filterPlayerHistory(history, 14).length, 14);
  assert.equal(filterPlayerHistory(history, "AUG1").length, 20);
});

test("la variación conserva el signo para pintar verde o rojo", () => {
  assert.equal(historyDelta([point("2026-08-01", 10), point("2026-08-02", 7)]), -3);
  assert.equal(historyDelta([point("2026-08-01", 10)]), null);
});
