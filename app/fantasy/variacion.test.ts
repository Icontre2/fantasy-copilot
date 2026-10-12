import assert from "node:assert/strict";
import test from "node:test";
import { variacion } from "./variacion.ts";

const dia = (d: string, millones: number) => ({ date: `2026-10-${d}T00:00:00+02:00`, marketValue: millones * 1_000_000 });

test("compara con el valor de hace N días por fecha", () => {
  const serie = [dia("01", 10), dia("05", 11), dia("08", 12), dia("12", 15)];
  const v = variacion(serie, 7);
  assert.equal(v?.euros, 4_000_000);
  assert.equal(v?.porcentaje, 4 / 11);
  assert.equal(v?.desde, serie[1]!.date);
});

test("si a la serie le falta algún día, sigue midiendo días y no puntos", () => {
  const serie = [dia("01", 10), dia("11", 12), dia("12", 13)];
  assert.equal(variacion(serie, 7)?.euros, 3_000_000);
});

test("sin historia suficiente devuelve null, no +0 %", () => {
  assert.equal(variacion([dia("10", 10), dia("12", 11)], 7), null);
  assert.equal(variacion([], 7), null);
});

test("una bajada sale negativa", () => {
  const v = variacion([dia("01", 20), dia("12", 15)], 7);
  assert.equal(v?.euros, -5_000_000);
  assert.equal(v?.porcentaje, -0.25);
});
