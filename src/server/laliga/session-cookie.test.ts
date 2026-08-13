import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClearCookies,
  buildSessionCookies,
  readSessionId,
  SESSION_COOKIE,
} from "./session-cookie.ts";

/**
 * Estas pruebas cubren el fallo silencioso mas peligroso de todo el login: una
 * cookie que pasa de 4096 bytes la descarta el navegador SIN avisar. El login
 * responderia 200, el usuario veria "entrando..." y volveria a la pantalla de
 * acceso, sin ningun error en ningun sitio.
 */

/** Convierte las cabeceras Set-Cookie en la cabecera Cookie que mandaria el navegador. */
function asRequest(setCookies: string[]): Request {
  const jar = setCookies
    .map((cookie) => cookie.split(";")[0] ?? "")
    .filter((pair) => {
      const [, value] = pair.split("=");
      return value !== undefined && value !== "";
    });
  return new Request("https://example.test/", { headers: { cookie: jar.join("; ") } });
}

test("una sesion corta viaja en una sola cookie y vuelve igual", () => {
  const value = "id-opaco-de-supabase";
  const readBack = readSessionId(asRequest(buildSessionCookies(value)));
  assert.equal(readBack, value);
});

test("una sesion larga se trocea y se reconstruye exacta", () => {
  // ~9 KB: el tamaño realista de dos tokens de Azure B2C cifrados.
  const value = "z".repeat(9_000);
  const cookies = buildSessionCookies(value);

  const withContent = cookies.filter((cookie) => !cookie.includes("Max-Age=0"));
  assert.ok(withContent.length > 1, "deberia haberse troceado");

  assert.equal(readSessionId(asRequest(cookies)), value);
});

test("ninguna cookie supera el limite del navegador", () => {
  for (const cookie of buildSessionCookies("z".repeat(9_000))) {
    assert.ok(cookie.length < 4096, `cookie de ${cookie.length} bytes: el navegador la descartaria`);
  }
});

test("los trozos de una sesion anterior mas larga se caducan", () => {
  const largos = buildSessionCookies("z".repeat(9_000));
  const cortos = buildSessionCookies("corta");

  // La sesion corta debe caducar explicitamente los indices que la larga uso.
  const caducados = cortos.filter((cookie) => cookie.includes("Max-Age=0"));
  assert.ok(caducados.length >= largos.filter((c) => !c.includes("Max-Age=0")).length - 1);

  // Y si el navegador respeta esas caducidades, se lee la corta sin restos.
  assert.equal(readSessionId(asRequest(cortos)), "corta");
});

test("sin cookie no hay sesion", () => {
  assert.equal(readSessionId(new Request("https://example.test/")), undefined);
});

test("el cierre de sesion caduca todos los trozos", () => {
  const cookies = buildClearCookies();
  assert.ok(cookies.every((cookie) => cookie.includes("Max-Age=0")));
  assert.equal(readSessionId(asRequest(cookies)), undefined);
});

test("la cookie es httpOnly y SameSite: el navegador no puede leer el token", () => {
  for (const cookie of buildSessionCookies("lo-que-sea")) {
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
  }
});

test("un valor con caracteres especiales sobrevive al viaje", () => {
  // El cifrado usa base64url, pero el id de Supabase o una rotacion futura
  // podrian traer `=` o `;`, que romperian el parseo si no se codificara.
  const value = "a=b;c d+e/f==";
  assert.equal(readSessionId(asRequest(buildSessionCookies(value))), value);
});

test("el nombre de la primera cookie no cambia: hay sesiones abiertas con el", () => {
  assert.ok(buildSessionCookies("x")[0]?.startsWith(`${SESSION_COOKIE}=`));
});
