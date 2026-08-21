import assert from "node:assert/strict";
import test from "node:test";
import { emailAutorizado, hayAdminsConfigurados, listaDeAdmins } from "./access.ts";

/**
 * "Un usuario no autorizado no puede entrar" (uno de los tests obligatorios
 * del encargo), en su forma pura: sin cookie, sin red, sin `process.env` real
 * de por medio — cada caso pasa su propia lista.
 */

test("sin admins configurados, el panel queda cerrado para todo el mundo", () => {
  assert.equal(hayAdminsConfigurados(""), false);
  assert.equal(hayAdminsConfigurados(undefined), false, "sin la variable puesta, falla cerrado");
  assert.deepEqual(listaDeAdmins(""), []);
});

test("un correo que no está en la lista, no entra", () => {
  const admins = listaDeAdmins("dueño@ligalab.app");
  assert.equal(emailAutorizado("manager-cualquiera@gmail.com", admins), false);
});

test("el correo de la lista sí entra, insensible a mayúsculas y a espacios", () => {
  const admins = listaDeAdmins("Dueño@LigaLab.app, otro@x.com");
  assert.equal(emailAutorizado("dueño@ligalab.app", admins), true);
  assert.equal(emailAutorizado("  OTRO@X.COM  ", admins), true);
});

test("una lista con comas y huecos sueltos no cuela entradas vacías", () => {
  assert.deepEqual(listaDeAdmins(" a@b.com ,, ,c@d.com,"), ["a@b.com", "c@d.com"]);
});
