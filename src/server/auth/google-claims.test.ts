import assert from "node:assert/strict";
import test from "node:test";
import { claveDeIdentidad, cuerpoDeJwt, identidadDe } from "./google-claims.ts";

const CLIENTE = "123-abc.apps.googleusercontent.com";
const AHORA = 1_800_000_000_000; // ms
const EXP = Math.floor(AHORA / 1000) + 3600;

/** Un id_token con el cuerpo que se le pida. La firma no se mira (ver el modulo). */
function token(cuerpo: Record<string, unknown>): string {
  const parte = (o: unknown) => Buffer.from(JSON.stringify(o), "utf8").toString("base64url");
  return `${parte({ alg: "RS256" })}.${parte(cuerpo)}.firma-que-no-se-verifica`;
}

const BUENO = {
  iss: "https://accounts.google.com",
  aud: CLIENTE,
  sub: "10769150350006150715113082367",
  email: "alguien@gmail.com",
  email_verified: true,
  name: "Alguien",
  picture: "https://lh3.googleusercontent.com/foto",
  exp: EXP,
};

test("un id_token normal da la identidad", () => {
  const r = identidadDe(token(BUENO), CLIENTE, AHORA);
  assert.ok(r.ok);
  assert.equal(r.identidad.sub, BUENO.sub);
  assert.equal(r.identidad.email, "alguien@gmail.com");
  assert.equal(r.identidad.nombre, "Alguien");
});

test("un token para OTRA aplicacion se rechaza", () => {
  const r = identidadDe(token({ ...BUENO, aud: "otra-app.apps.googleusercontent.com" }), CLIENTE, AHORA);
  assert.equal(r.ok, false);
  assert.match(r.ok === false ? r.motivo : "", /otra aplicación/);
});

test("`aud` puede venir como lista, y vale si estamos dentro", () => {
  const dentro = identidadDe(token({ ...BUENO, aud: ["otra", CLIENTE] }), CLIENTE, AHORA);
  assert.equal(dentro.ok, true);
  const fuera = identidadDe(token({ ...BUENO, aud: ["otra", "tercera"] }), CLIENTE, AHORA);
  assert.equal(fuera.ok, false);
});

test("un emisor que no es Google se rechaza", () => {
  const r = identidadDe(token({ ...BUENO, iss: "https://evil.example" }), CLIENTE, AHORA);
  assert.equal(r.ok, false);
  assert.match(r.ok === false ? r.motivo : "", /no lo ha emitido Google/);
});

test("los dos emisores que Google usa valen los dos", () => {
  for (const iss of ["accounts.google.com", "https://accounts.google.com"]) {
    assert.equal(identidadDe(token({ ...BUENO, iss }), CLIENTE, AHORA).ok, true, iss);
  }
});

test("un token caducado se rechaza, y justo en el limite tambien", () => {
  assert.equal(identidadDe(token({ ...BUENO, exp: Math.floor(AHORA / 1000) }), CLIENTE, AHORA).ok, false);
  assert.equal(identidadDe(token({ ...BUENO, exp: Math.floor(AHORA / 1000) + 1 }), CLIENTE, AHORA).ok, true);
});

test("un correo sin verificar NO identifica a nadie", () => {
  const r = identidadDe(token({ ...BUENO, email_verified: false }), CLIENTE, AHORA);
  assert.equal(r.ok, false);
  assert.match(r.ok === false ? r.motivo : "", /no está verificado/);
  // Y si falta el campo, tampoco: ausencia no es verificacion.
  const sinCampo = { ...BUENO } as Record<string, unknown>;
  delete sinCampo.email_verified;
  assert.equal(identidadDe(token(sinCampo), CLIENTE, AHORA).ok, false);
});

test("sin `sub` o sin correo no hay identidad", () => {
  const sinSub = { ...BUENO } as Record<string, unknown>;
  delete sinSub.sub;
  assert.equal(identidadDe(token(sinSub), CLIENTE, AHORA).ok, false);

  const sinEmail = { ...BUENO } as Record<string, unknown>;
  delete sinEmail.email;
  assert.equal(identidadDe(token(sinEmail), CLIENTE, AHORA).ok, false);
});

test("nombre y foto son opcionales y quedan en null, no en cadena vacia", () => {
  const r = identidadDe(token({ ...BUENO, name: "", picture: undefined }), CLIENTE, AHORA);
  assert.ok(r.ok);
  assert.equal(r.identidad.nombre, null);
  assert.equal(r.identidad.foto, null);
});

test("cualquier cosa que no sea un JWT se rechaza sin reventar", () => {
  assert.equal(cuerpoDeJwt("no.es.jwt"), null);
  assert.equal(cuerpoDeJwt("una-sola-parte"), null);
  assert.equal(identidadDe("", CLIENTE, AHORA).ok, false);
  assert.equal(identidadDe("a.b", CLIENTE, AHORA).ok, false);
});

test("la clave de identidad lleva el proveedor delante", () => {
  assert.equal(claveDeIdentidad("google", "123"), "google:123");
  // Dos proveedores con el mismo sub no pueden acabar en la misma cuenta.
  assert.notEqual(claveDeIdentidad("google", "123"), claveDeIdentidad("facebook", "123"));
});
