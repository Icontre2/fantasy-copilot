import assert from "node:assert/strict";
import test from "node:test";
import { codigoB2C, mensajeDeLogin } from "./auth-errors.ts";

/** Texto REAL que devolvió el login de LALIGA (visto el 2026-08-17). */
const REAL_90225 =
  "AADB2C90225: The username or password provided in the request are invalid.\n" +
  "Correlation ID: 00000000-0000-0000-0000-000000000000\nTimestamp: 2026-08-17 09:16:00Z";

test("el codigo se saca del texto crudo, con ruido detras y todo", () => {
  assert.equal(codigoB2C(REAL_90225), "AADB2C90225");
  assert.equal(codigoB2C("sin codigo ninguno"), null);
});

test("credenciales invalidas se explican en castellano y sin el codigo", () => {
  const mensaje = mensajeDeLogin(REAL_90225);
  assert.ok(!mensaje.includes("AADB2C"), "no se le enseña el codigo al usuario");
  assert.ok(!/password provided/.test(mensaje), "no queda nada en ingles");
  assert.match(mensaje, /email o la contraseña/);
});

test("y se mencionan las DOS causas, porque el codigo no las distingue", () => {
  const mensaje = mensajeDeLogin(REAL_90225);
  // La contraseña mal.
  assert.match(mensaje, /no son correctos/);
  // Y la cuenta social, que da el mismo codigo.
  assert.match(mensaje, /Google/);
  assert.match(mensaje, /Apple/);
  assert.match(mensaje, /Facebook/);
});

test("y no deja al usuario en un callejon: dice que puede mirar", () => {
  // Sin prometer que se pueda: "mira si puedes", no "puedes".
  assert.match(mensajeDeLogin("AADB2C90225: invalid."), /mira en la app oficial/);
});

test("el bloqueo por intentos dice que lo bloquea LALIGA, no la app", () => {
  const mensaje = mensajeDeLogin("AADB2C90157: The user has exceeded the maximum request rate.");
  assert.match(mensaje, /bloqueado temporalmente/);
  assert.match(mensaje, /no es cosa de esta app/);
});

test("un codigo que no conocemos conserva su texto en vez de inventarse una causa", () => {
  const mensaje = mensajeDeLogin("AADB2C99999: Something we have never seen.");
  assert.match(mensaje, /login de LALIGA ha rechazado/);
  // El original se conserva entero: ocultarlo dejaria al usuario sin nada que buscar.
  assert.match(mensaje, /AADB2C99999: Something we have never seen\./);
});

test("un error sin codigo tambien se enmarca como de LALIGA", () => {
  assert.match(mensajeDeLogin("invalid_grant"), /login de LALIGA ha rechazado el acceso: invalid_grant/);
});

test("un detalle vacio no produce una frase a medias", () => {
  assert.match(mensajeDeLogin("   "), /sin decir por qué/);
});
