import assert from "node:assert/strict";
import test from "node:test";
import { firmar, verificar } from "./identity-cookie.ts";

const CLAVE = "una-clave-de-al-menos-treinta-y-dos-caracteres";
const OTRA = "otra-clave-distinta-de-treinta-y-dos-caracteres";

test("lo firmado se recupera igual", () => {
  assert.equal(verificar(firmar("google:12345", CLAVE), CLAVE), "google:12345");
});

test("EL caso: no se puede falsificar la identidad de otro", () => {
  // Un atacante escribe la cookie a mano con el identificador de la victima.
  const falsa = `i1.${Buffer.from("google:victima", "utf8").toString("base64url")}.firma-inventada`;
  assert.equal(verificar(falsa, CLAVE), null);
});

test("cambiar el cuerpo invalida la firma", () => {
  const [version, , mac] = firmar("google:12345", CLAVE).split(".");
  const otroCuerpo = Buffer.from("google:99999", "utf8").toString("base64url");
  assert.equal(verificar(`${version}.${otroCuerpo}.${mac}`, CLAVE), null);
});

test("una cookie de otra instalacion no vale aqui", () => {
  assert.equal(verificar(firmar("google:12345", OTRA), CLAVE), null);
});

test("basura o formato incompleto devuelve null sin reventar", () => {
  for (const valor of ["", "i1", "i1.solo-cuerpo", "otra-version.a.b", "....", "i1..mac"]) {
    assert.equal(verificar(valor, CLAVE), null, valor);
  }
});

test("una identidad vacia no se acepta aunque venga bien firmada", () => {
  // Sin esto, una cadena vacia firmada seria una identidad valida y todas las
  // sesiones sin identificar compartirian la misma "cuenta".
  assert.equal(verificar(firmar("", CLAVE), CLAVE), null);
});

test("los dos puntos del identificador no rompen el formato", () => {
  // El identificador lleva `proveedor:sub` y el formato de la cookie usa puntos,
  // asi que el cuerpo va en base64url justo para que no se pisen.
  const identidad = "google:1076915035.con.puntos";
  assert.equal(verificar(firmar(identidad, CLAVE), CLAVE), identidad);
});
