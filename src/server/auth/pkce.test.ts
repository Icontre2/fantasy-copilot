import assert from "node:assert/strict";
import test from "node:test";
import { caducado, desafioDe, desempaquetar, empaquetar, mismoState, nuevoIntento, VALIDEZ_MS } from "./pkce.ts";

test("el desafio coincide con el ejemplo del RFC 7636", () => {
  // Apendice B del RFC: este par verifier/challenge esta publicado y fijado.
  // Si esto se desvia, Google rechaza todos los canjes.
  assert.equal(
    desafioDe("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

test("dos intentos nunca salen iguales", () => {
  const a = nuevoIntento(0);
  const b = nuevoIntento(0);
  assert.notEqual(a.state, b.state);
  assert.notEqual(a.verifier, b.verifier);
  // Y el state no es el verifier: mandar el secreto como state lo publicaria.
  assert.notEqual(a.state, a.verifier);
});

test("un intento sobrevive al viaje de ida y vuelta por la cookie", () => {
  const intento = nuevoIntento(1_000);
  assert.deepEqual(desempaquetar(empaquetar(intento)), intento);
});

test("una cookie manipulada no se acepta como intento", () => {
  assert.equal(desempaquetar("no-es-base64-de-nada!!"), null);
  assert.equal(desempaquetar(Buffer.from("{}", "utf8").toString("base64url")), null);
  assert.equal(desempaquetar(Buffer.from('{"state":"a"}', "utf8").toString("base64url")), null);
  // Un state vacio pasaria el typeof y haria que cualquier respuesta valiera.
  assert.equal(
    desempaquetar(Buffer.from('{"state":"","verifier":"v","creado":1}', "utf8").toString("base64url")),
    null,
  );
});

test("el state solo vale si es exactamente el mismo", () => {
  assert.equal(mismoState("abc", "abc"), true);
  assert.equal(mismoState("abc", "abd"), false);
  // Distinta longitud no puede reventar la comparacion.
  assert.equal(mismoState("abc", "ab"), false);
  assert.equal(mismoState("", ""), true);
});

test("un intento caduca a los diez minutos", () => {
  const intento = nuevoIntento(1_000);
  assert.equal(caducado(intento, 1_000), false);
  assert.equal(caducado(intento, 1_000 + VALIDEZ_MS), false);
  assert.equal(caducado(intento, 1_000 + VALIDEZ_MS + 1), true);
});
