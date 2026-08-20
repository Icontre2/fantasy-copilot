import assert from "node:assert/strict";
import test from "node:test";
import { COOKIE_AVISO, COOKIE_ERROR, cookieDeAviso, leerCookie, limpiarAviso, limpiarError } from "./cookies.ts";
import { pareceCookie } from "../http/responses.ts";

/**
 * El fallo que había: `[...galletas, ...(hayError ? limpiarError() : [])]`.
 *
 * `limpiarError()` devuelve un STRING, y extender un string en un array reparte
 * sus letras. En vez de una cookie salían sesenta cabeceras de un carácter, y la
 * cookie del error nunca se caducaba: el aviso se quedaba pegado a la pantalla
 * un minuto entero y volvía a salir en cada recarga. Sin una línea en ningún log.
 *
 * Este test fija lo que hace falta para que eso no vuelva: cada limpiador
 * devuelve UNA cookie entera, y hay un filtro que reconoce las que no lo son.
 */
test("cada limpiador devuelve una cookie entera, no letras sueltas", () => {
  for (const cookie of [limpiarError(), limpiarAviso()]) {
    assert.equal(pareceCookie(cookie), true, `«${cookie}» no tiene forma de cookie`);
    assert.equal(cookie.includes("Max-Age=0"), true, "una cookie que se limpia tiene que caducar");
  }
  assert.equal(limpiarError().startsWith(`${COOKIE_ERROR}=`), true);
  assert.equal(limpiarAviso().startsWith(`${COOKIE_AVISO}=`), true);
});

test("las letras sueltas de un string extendido no pasan el filtro", () => {
  const letras = [...limpiarError()];
  assert.equal(letras.length > 10, true, "el montaje del test ya no reproduce el fallo");
  assert.equal(
    letras.some((letra) => pareceCookie(letra)),
    false,
    "alguna letra suelta se colaría como cookie",
  );
});

test("el aviso viaja escapado y se puede volver a leer", () => {
  const mensaje = "Cuenta enlazada. La próxima vez entra con Google; sin contraseña.";
  const cookie = cookieDeAviso(mensaje);
  assert.equal(pareceCookie(cookie), true);
  // El punto y coma del mensaje no debe partir la cookie en dos.
  assert.equal(cookie.split(";")[0]!.includes("%3B"), true);

  const peticion = new Request("https://ejemplo.test/", {
    headers: { cookie: cookie.split(";")[0]! },
  });
  assert.equal(leerCookie(peticion, COOKIE_AVISO), mensaje);
});
