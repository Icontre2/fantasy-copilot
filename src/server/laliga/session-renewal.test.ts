import assert from "node:assert/strict";
import test from "node:test";

/**
 * Cuándo hay que renovar una sesión que vive dentro de la cookie.
 *
 * La decisión vive dentro de `renovarSesionDeCookie`, que además habla con
 * LALIGA. Aquí se prueba SOLO la regla temporal, que es la que tenía el fallo:
 * antes no se renovaba nunca en modo cookie y la sesión se moría cada 24 h
 * teniendo el refresh token a mano, sin usar, dentro de la propia cookie.
 */

const MARGEN_MS = 12 * 60 * 60 * 1000;

/** La misma condición que aplica `renovarSesionDeCookie`. */
function tocaRenovar(ahora: number, expiraEn: number): boolean {
  return !(ahora + MARGEN_MS < expiraEn);
}

const AHORA = Date.parse("2026-08-20T12:00:00.000Z");
const HORA = 3_600_000;

test("con muchas horas por delante no se molesta a LALIGA", () => {
  assert.equal(tocaRenovar(AHORA, AHORA + 20 * HORA), false);
  assert.equal(tocaRenovar(AHORA, AHORA + 13 * HORA), false);
});

test("dentro del margen de doce horas se renueva antes de caducar", () => {
  assert.equal(tocaRenovar(AHORA, AHORA + 11 * HORA), true);
  assert.equal(tocaRenovar(AHORA, AHORA + 1 * HORA), true);
});

/**
 * El caso que dejaba a la gente fuera: vuelves al día siguiente, el access token
 * ya caducó, pero el refresh token sigue vivo. Antes se enseñaba la pantalla de
 * acceso; ahora se renueva.
 */
test("un token YA caducado también se intenta renovar", () => {
  assert.equal(tocaRenovar(AHORA, AHORA - 1), true);
  assert.equal(tocaRenovar(AHORA, AHORA - 48 * HORA), true);
});

test("justo en el límite se renueva, que es el lado seguro", () => {
  assert.equal(tocaRenovar(AHORA, AHORA + MARGEN_MS), true);
});
