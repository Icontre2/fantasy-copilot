import assert from "node:assert/strict";
import test from "node:test";
import { puntosPorMillon, salidaSobreValor } from "./market-metrics.ts";

test("puntos por millón", () => {
  assert.equal(puntosPorMillon(30, 10_000_000), 3);
  assert.equal(puntosPorMillon(-4, 2_000_000), -2);
});

test("sin valor publicado no hay división: null, no cero", () => {
  assert.equal(puntosPorMillon(30, 0), null);
  assert.equal(salidaSobreValor(5_000_000, 0), null);
});

test("salida por encima y por debajo de su valor", () => {
  assert.equal(salidaSobreValor(11_000_000, 10_000_000)?.toFixed(2), "0.10");
  assert.equal(salidaSobreValor(9_000_000, 10_000_000)?.toFixed(2), "-0.10");
  assert.equal(salidaSobreValor(10_000_000, 10_000_000), 0);
});
