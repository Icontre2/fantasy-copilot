import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { COOKIE_USUARIO, COOKIE_USUARIO_REFRESCO, cookieDeRefrescoDeUsuario, cookieDeUsuario } from "./cookies.ts";

/**
 * La identidad del panel de marketing tenía una hora de vida, porque la
 * cookie lleva el access token de Supabase tal cual. Para el flujo del
 * producto («entra con Google y acto seguido conecta LALIGA») no se notaba;
 * para un panel que se abre a diario significaba repetir el login social cada
 * vez.
 *
 * Estas pruebas fijan lo que hace que eso no vuelva: que exista una cookie de
 * refresco aparte y que dure MUCHO más que la de identidad. La renovación en
 * sí habla con Supabase, así que se comprueba con el contrato de la función
 * (abajo) en vez de con una llamada real.
 */

test("la cookie de refresco es una cookie distinta de la de identidad", () => {
  assert.notEqual(COOKIE_USUARIO, COOKIE_USUARIO_REFRESCO);
});

function maxAge(cookie: string): number {
  const encontrado = /Max-Age=(\d+)/.exec(cookie);
  assert.ok(encontrado, `la cookie no declara Max-Age: ${cookie}`);
  return Number(encontrado[1]);
}

test("el refresco dura mucho más que la identidad — si no, no arreglaría nada", () => {
  const identidad = maxAge(cookieDeUsuario("token"));
  const refresco = maxAge(cookieDeRefrescoDeUsuario("token"));

  assert.equal(identidad, 3600, "la identidad sigue durando lo que dura el token de Supabase");
  assert.ok(refresco > identidad * 24, `el refresco (${refresco}s) tiene que durar mucho más que la identidad`);
});

test("las dos cookies son httpOnly: el refresh token no puede leerlo JavaScript del navegador", () => {
  for (const cookie of [cookieDeUsuario("t"), cookieDeRefrescoDeUsuario("t")]) {
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
  }
});

/**
 * El fallo que ya costó una sesión entera con el enlace de LALIGA: Supabase
 * ROTA el refresh token en cada renovación. Si se renueva y no se guarda el
 * nuevo, la siguiente vez se usa uno gastado y el acceso se cae — con el
 * síntoma «vuelve a entrar con Google», sin nada en ningún log.
 */
test("al renovar se guarda el refresh token NUEVO, no el que se mandó", () => {
  const codigo = readFileSync(new URL("./identity.ts", import.meta.url), "utf8");
  const cuerpo = codigo.slice(codigo.indexOf("export async function identidadDePeticionConRefresco"));

  assert.match(cuerpo, /renovado\.refreshToken/, "tiene que guardar el token devuelto por la renovación");
  assert.match(cuerpo, /cookieDeRefrescoDeUsuario\(renovado\.refreshToken\)/);
});

test("si el refresh token tampoco vale, se limpia en vez de reintentar para siempre", () => {
  const codigo = readFileSync(new URL("./identity.ts", import.meta.url), "utf8");
  const cuerpo = codigo.slice(codigo.indexOf("export async function identidadDePeticionConRefresco"));
  assert.match(cuerpo, /limpiarRefrescoDeUsuario\(\)/);
});

/**
 * El producto sigue usando `identidadDePeticion`, que NO renueva. Es
 * deliberado: cambiarla obligaría a que todas sus rutas supieran devolver
 * cookies, y el acceso social ya costó bastante arreglar como para tocarlo
 * fuera de este sprint.
 */
test("la función que usa el producto sigue existiendo y sin renovar", () => {
  const codigo = readFileSync(new URL("./identity.ts", import.meta.url), "utf8");
  const original = codigo.slice(
    codigo.indexOf("export async function identidadDePeticion("),
    codigo.indexOf("export async function identidadDePeticionConRefresco"),
  );
  assert.ok(original.length > 0, "identidadDePeticion tiene que seguir existiendo");
  assert.equal(/refrescarUsuario/.test(original), false, "la variante del producto no debe renovar");
});
