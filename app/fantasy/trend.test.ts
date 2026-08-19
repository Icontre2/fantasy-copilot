import assert from "node:assert/strict";
import test from "node:test";
import { COLOR_BAJA, COLOR_SIN_DATO, COLOR_SUBE, sparklinePoints, trendColor } from "./trend.ts";

test("sin dato y plano comparten gris: ninguno de los dos es una subida", () => {
  assert.equal(trendColor(null), COLOR_SIN_DATO);
  assert.equal(trendColor(undefined), COLOR_SIN_DATO);
  assert.equal(trendColor(0), COLOR_SIN_DATO);
  assert.equal(trendColor(1), COLOR_SUBE);
  assert.equal(trendColor(-1), COLOR_BAJA);
});

test("la línea ocupa todo el ancho y respeta el suelo y el techo", () => {
  const coords = sparklinePoints([10, 20, 30]).split(" ").map((par) => par.split(",").map(Number));
  assert.deepEqual(coords[0], [0, 21]); // el mínimo, en el suelo
  assert.deepEqual(coords[2], [100, 3]); // el máximo, arriba del todo
  assert.deepEqual(coords[1], [50, 12]);
});

test("una serie plana no se divide por cero", () => {
  assert.equal(sparklinePoints([7, 7]), "0.00,21.00 100.00,21.00");
});

test("sin dos puntos no hay línea que dibujar", () => {
  assert.equal(sparklinePoints([]), "");
  assert.equal(sparklinePoints([5]), "");
});
