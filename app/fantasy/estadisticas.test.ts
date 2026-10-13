import assert from "node:assert/strict";
import test from "node:test";
import { filasDeEstadistica, forma, ordenar } from "./estadisticas.ts";
import type { Player } from "./types.ts";

const p = (name: string, points: number, value: number, week: number[], position = "DEL", team = "BAR"): Player =>
  ({ id: name, name, team, position, marketValue: value * 1e6, points, averagePoints: points / Math.max(1, week.length), status: "ok", weekPoints: week.map((puntos, i) => ({ jornada: i + 1, puntos })) }) as Player;

test("forma: media de las 3 últimas jornadas; sin jornadas, null", () => {
  assert.equal(forma(p("a", 0, 1, [2, 4, 6, 8])), 6);
  assert.equal(forma(p("b", 0, 1, [])), null);
});

test("rentabilidad: puntos por millón, y orden por cada criterio", () => {
  const filas = filasDeEstadistica([p("caro", 60, 60, [10, 10]), p("barato", 30, 5, [15, 15]), p("med", 40, 20, [1, 1], "MED", "RMA")]);
  const base = { posicion: "TODAS" as const, equipo: null, busqueda: "" };
  assert.deepEqual(ordenar(filas, { ...base, orden: "PUNTOS" }).map((f) => f.player.name), ["caro", "med", "barato"]);
  assert.deepEqual(ordenar(filas, { ...base, orden: "RENTABILIDAD" }).map((f) => f.player.name), ["barato", "med", "caro"]);
  assert.deepEqual(ordenar(filas, { ...base, orden: "FORMA" }).map((f) => f.player.name), ["barato", "caro", "med"]);
  assert.deepEqual(ordenar(filas, { ...base, orden: "PUNTOS", posicion: "MED" }).map((f) => f.player.name), ["med"]);
  assert.deepEqual(ordenar(filas, { ...base, orden: "PUNTOS", equipo: "RMA" }).map((f) => f.player.name), ["med"]);
  assert.deepEqual(ordenar(filas, { ...base, orden: "PUNTOS", busqueda: "bar" }).map((f) => f.player.name), ["caro", "barato"]);
});
