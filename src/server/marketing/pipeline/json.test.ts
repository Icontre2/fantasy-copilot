import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { pedirJSON } from "./json.ts";
import type { LlamadaClaude, RespuestaDeClaude } from "./claude.ts";

/**
 * `pedirJSON` es la pieza que de verdad puede fallar (un modelo que no
 * obedece el formato, JSON envuelto en ```json, un reintento que no arregla
 * nada). Se prueba con una `LlamadaClaude` de mentira — sin red, sin coste,
 * determinista — nunca con la API real.
 */

const schema = z.object({ hola: z.string() });

function respuesta(texto: string, inputTokens = 10, outputTokens = 5): RespuestaDeClaude {
  return { texto, usage: { inputTokens, outputTokens } };
}

function llamadaFija(...respuestas: RespuestaDeClaude[]): { llamar: LlamadaClaude; llamadas: string[] } {
  const llamadas: string[] = [];
  let i = 0;
  const llamar: LlamadaClaude = async ({ prompt }) => {
    llamadas.push(prompt);
    const r = respuestas[Math.min(i, respuestas.length - 1)];
    i += 1;
    return r;
  };
  return { llamar, llamadas };
}

test("JSON válido a la primera: una sola llamada, sin reintento", async () => {
  const { llamar, llamadas } = llamadaFija(respuesta('{"hola":"mundo"}'));
  const resultado = await pedirJSON(llamar, { model: "x", system: "s", prompt: "p", schema });
  assert.deepEqual(resultado.data, { hola: "mundo" });
  assert.equal(llamadas.length, 1);
});

test("acumula el uso de tokens de la única llamada", async () => {
  const { llamar } = llamadaFija(respuesta('{"hola":"mundo"}', 100, 40));
  const resultado = await pedirJSON(llamar, { model: "x", system: "s", prompt: "p", schema });
  assert.deepEqual(resultado.usage, { inputTokens: 100, outputTokens: 40 });
});

test("acepta JSON envuelto en un bloque ```json pese a la instrucción", async () => {
  const { llamar } = llamadaFija(respuesta('Aquí tienes:\n```json\n{"hola":"mundo"}\n```\n'));
  const resultado = await pedirJSON(llamar, { model: "x", system: "s", prompt: "p", schema });
  assert.deepEqual(resultado.data, { hola: "mundo" });
});

test("JSON roto la primera vez, válido en el reintento: dos llamadas, se acumula el uso de ambas", async () => {
  const { llamar, llamadas } = llamadaFija(
    respuesta("esto no es json", 50, 20),
    respuesta('{"hola":"mundo"}', 30, 10),
  );
  const resultado = await pedirJSON(llamar, { model: "x", system: "s", prompt: "el prompt original", schema });
  assert.deepEqual(resultado.data, { hola: "mundo" });
  assert.equal(llamadas.length, 2);
  assert.match(llamadas[1], /Error:/);
  assert.match(llamadas[1], /esto no es json/);
});

test("no cumple el schema (falta el campo) la primera vez, se corrige en el reintento", async () => {
  const { llamar } = llamadaFija(respuesta('{"otroCampo":"x"}'), respuesta('{"hola":"mundo"}'));
  const resultado = await pedirJSON(llamar, { model: "x", system: "s", prompt: "p", schema });
  assert.deepEqual(resultado.data, { hola: "mundo" });
});

test("roto en las dos llamadas: lanza, y nunca hace una tercera", async () => {
  const { llamar, llamadas } = llamadaFija(respuesta("roto uno"), respuesta("roto dos"));
  await assert.rejects(
    () => pedirJSON(llamar, { model: "x", system: "s", prompt: "p", schema }),
    /No se pudo obtener JSON válido tras un reintento/,
  );
  assert.equal(llamadas.length, 2, "nunca debe reintentar una tercera vez");
});
