import assert from "node:assert/strict";
import test from "node:test";
import { rentabilidad } from "./value-ratio.ts";

const j = (id: string, position: string, millones: number, points: number, status = "ok") => ({
  id, position, marketValue: millones * 1_000_000, points, status,
});

test("puntos por millón y puesto dentro de su posición", () => {
  const catalogo = [j("1", "DEF", 10, 20), j("2", "DEF", 5, 20), j("3", "DEF", 20, 20), j("4", "DEL", 1, 100)];
  const r = rentabilidad("1", catalogo);
  assert.deepEqual(r, { puntosPorMillon: 2, puesto: 2, de: 3 });
});

test("los que ya no están en la liga no cuentan", () => {
  const catalogo = [j("1", "DEF", 10, 20), j("2", "DEF", 1, 50, "out_of_league")];
  assert.deepEqual(rentabilidad("1", catalogo), { puntosPorMillon: 2, puesto: 1, de: 1 });
});

test("sin valor publicado o fuera del catálogo devuelve null, no un cero", () => {
  assert.equal(rentabilidad("1", [j("1", "DEF", 0, 20)]), null);
  assert.equal(rentabilidad("9", [j("1", "DEF", 10, 20)]), null);
});

test("empates comparten puesto", () => {
  const catalogo = [j("1", "MED", 10, 20), j("2", "MED", 10, 20)];
  assert.equal(rentabilidad("2", catalogo)?.puesto, 1);
});
