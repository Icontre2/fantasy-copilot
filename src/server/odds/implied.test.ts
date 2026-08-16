import assert from "node:assert/strict";
import test from "node:test";
import { dificultad, esCuotaValida, probabilidades } from "./implied.ts";

const cerca = (valor: number, esperado: number, tolerancia = 0.005) =>
  assert.ok(Math.abs(valor - esperado) < tolerancia, `${valor} no está cerca de ${esperado}`);

test("un partido perfectamente parejo reparte un tercio a cada resultado", () => {
  const p = probabilidades({ local: 3, empate: 3, visitante: 3 });
  cerca(p!.local, 1 / 3);
  cerca(p!.empate, 1 / 3);
  cerca(p!.visitante, 1 / 3);
});

test("las tres probabilidades suman exactamente 1 despues de quitar el margen", () => {
  const p = probabilidades({ local: 1.5, empate: 4.2, visitante: 6.5 })!;
  cerca(p.local + p.empate + p.visitante, 1, 1e-9);
});

test("el margen de la casa se calcula y se expone, no se esconde", () => {
  // 1/2 + 1/4 + 1/4 = 1.00 exacto: unas cuotas sin comision.
  cerca(probabilidades({ local: 2, empate: 4, visitante: 4 })!.margen, 1);
  // Cuotas mas cortas: la casa se queda algo.
  assert.ok(probabilidades({ local: 1.9, empate: 3.8, visitante: 3.8 })!.margen > 1);
});

test("una cuota de 2,00 NO es un 50 % una vez quitado el margen", () => {
  // Es la confusion clasica: 1/2 = 0,5 antes de repartir el exceso.
  const p = probabilidades({ local: 2, empate: 3.5, visitante: 3.5 })!;
  assert.ok(p.local < 0.5);
});

test("el favorito siempre sale con mas probabilidad que el rival", () => {
  const p = probabilidades({ local: 1.25, empate: 6, visitante: 12 })!;
  assert.ok(p.local > p.empate && p.local > p.visitante);
});

test("una cuota imposible invalida el partido entero", () => {
  // Con dos de tres no se puede repartir el margen: mejor nada que a medias.
  assert.equal(probabilidades({ local: 1, empate: 3, visitante: 4 }), null);
  assert.equal(probabilidades({ local: 0, empate: 3, visitante: 4 }), null);
  assert.equal(probabilidades({ local: Number.NaN, empate: 3, visitante: 4 }), null);
});

test("una cuota valida paga mas de lo apostado", () => {
  assert.equal(esCuotaValida(1.01), true);
  assert.equal(esCuotaValida(1), false);
  assert.equal(esCuotaValida("2.5"), false);
  assert.equal(esCuotaValida(undefined), false);
});

test("la dificultad se dice con palabras y en el orden esperado", () => {
  assert.equal(dificultad(0.8), "Muy favorable");
  assert.equal(dificultad(0.5), "Favorable");
  assert.equal(dificultad(0.35), "Igualado");
  assert.equal(dificultad(0.2), "Difícil");
  assert.equal(dificultad(0.05), "Muy difícil");
});
