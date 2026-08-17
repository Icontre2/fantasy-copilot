import assert from "node:assert/strict";
import test from "node:test";
import { activosDe, proveedorValido, PROVEEDORES } from "./providers.ts";

test("los tres proveedores de la app se aceptan", () => {
  for (const p of PROVEEDORES) assert.equal(proveedorValido(p), p);
});

test("EL caso: cualquier otra cosa se rechaza", () => {
  // El valor acaba dentro de la URL a la que se manda al usuario, asi que dejar
  // pasar texto libre seria dejar que un enlace preparado lleve a donde quiera.
  for (const malo of ["", "github", "GOOGLE", "google ", "../../evil", null, "google&provider=evil"]) {
    assert.equal(proveedorValido(malo), null, JSON.stringify(malo));
  }
});

test("los activos salen de lo que responde Supabase, no de suposiciones", () => {
  const settings = { external: { email: true, google: true, facebook: true, apple: false, github: true } };
  // Solo los nuestros, y solo los encendidos. GitHub esta activo pero no es de esta app.
  assert.deepEqual(activosDe(settings), ["google", "facebook"]);
});

test("con nada activado la lista queda vacia y no se enseña ningun boton", () => {
  // Es exactamente lo que devuelve el proyecto antes de configurar nada.
  assert.deepEqual(activosDe({ external: { email: true } }), []);
});

test("una respuesta rara no revienta ni inventa proveedores", () => {
  for (const basura of [null, undefined, 42, "texto", {}, { external: null }, { external: "no" }]) {
    assert.deepEqual(activosDe(basura), [], JSON.stringify(basura));
  }
});

test("un valor que no sea exactamente `true` no cuenta como activado", () => {
  // Supabase manda booleanos; cualquier otra cosa es una respuesta que no
  // entendemos, y ante la duda no se enseña el boton.
  assert.deepEqual(activosDe({ external: { google: "true", apple: 1, facebook: true } }), ["facebook"]);
});

test("el orden es el de la pantalla, no el que venga en la respuesta", () => {
  const settings = { external: { facebook: true, apple: true, google: true } };
  assert.deepEqual(activosDe(settings), ["google", "apple", "facebook"]);
});
