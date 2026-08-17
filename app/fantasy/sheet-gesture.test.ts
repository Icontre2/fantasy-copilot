import assert from "node:assert/strict";
import test from "node:test";
import {
  debeCerrarse,
  desplazamientoDe,
  opacidadDeFondo,
  UMBRAL_DISTANCIA,
  UMBRAL_VELOCIDAD,
  velocidadDe,
} from "./sheet-gesture.ts";

const ALTURA = 800;
const lento = { altura: ALTURA, velocidad: 0 };

test("un arrastre largo cierra aunque se suelte parado", () => {
  assert.equal(debeCerrarse({ ...lento, desplazamiento: ALTURA * UMBRAL_DISTANCIA }), true);
  assert.equal(debeCerrarse({ ...lento, desplazamiento: ALTURA * 0.9 }), true);
});

test("un arrastre corto y lento NO cierra: vuelve a su sitio", () => {
  assert.equal(debeCerrarse({ ...lento, desplazamiento: ALTURA * UMBRAL_DISTANCIA - 1 }), false);
  assert.equal(debeCerrarse({ ...lento, desplazamiento: 10 }), false);
});

test("EL caso que separa un gesto bueno de uno malo: el empujon corto y rapido", () => {
  // 30 px es poquisimo, pero soltado con brio significa "fuera" igual que un
  // arrastre largo. Solo con distancia esto rebotaria y pareceria que la app no
  // te ha hecho caso.
  assert.equal(debeCerrarse({ altura: ALTURA, desplazamiento: 30, velocidad: UMBRAL_VELOCIDAD }), true);
  assert.equal(debeCerrarse({ altura: ALTURA, desplazamiento: 30, velocidad: 2 }), true);
});

test("tirar hacia arriba no cierra, por rapido que sea", () => {
  assert.equal(debeCerrarse({ altura: ALTURA, desplazamiento: -100, velocidad: 5 }), false);
  assert.equal(debeCerrarse({ altura: ALTURA, desplazamiento: 0, velocidad: 5 }), false);
});

test("una altura sin medir no cierra por distancia, solo por velocidad", () => {
  // Pasa en el primer render, antes de medir. Mejor no cerrar que cerrar solo.
  assert.equal(debeCerrarse({ altura: 0, desplazamiento: 300, velocidad: 0 }), false);
  assert.equal(debeCerrarse({ altura: 0, desplazamiento: 300, velocidad: 1 }), true);
});

test("hacia abajo la hoja va pegada al dedo, uno a uno", () => {
  assert.equal(desplazamientoDe(0), 0);
  assert.equal(desplazamientoDe(50), 50);
  assert.equal(desplazamientoDe(400), 400);
});

test("hacia arriba resiste: se mueve, pero mucho menos que el dedo", () => {
  const poco = desplazamientoDe(-20);
  const mucho = desplazamientoDe(-300);
  // Se mueve algo, en la direccion correcta.
  assert.ok(poco < 0 && mucho < 0);
  // Pero siempre menos que el dedo…
  assert.ok(Math.abs(poco) < 20);
  assert.ok(Math.abs(mucho) < 300);
  // …y cada vez proporcionalmente menos: eso es lo que se siente como tope.
  assert.ok(Math.abs(mucho) / 300 < Math.abs(poco) / 20);
});

test("el fondo se aclara segun baja la hoja, pero nunca desaparece", () => {
  assert.equal(opacidadDeFondo(0, ALTURA), 1);
  assert.ok(opacidadDeFondo(ALTURA / 2, ALTURA) < 1);
  // Ni pasado el final: sin nada de fondo, la hoja flotaria sin separacion.
  assert.ok(opacidadDeFondo(ALTURA * 2, ALTURA) >= 0.25);
});

test("tirar hacia arriba no oscurece el fondo mas de lo que ya esta", () => {
  assert.equal(opacidadDeFondo(-100, ALTURA), 1);
});

test("la velocidad no revienta cuando dos eventos caen en el mismo milisegundo", () => {
  assert.equal(velocidadDe(100, 0), 0);
  assert.equal(velocidadDe(100, 200), 0.5);
});
