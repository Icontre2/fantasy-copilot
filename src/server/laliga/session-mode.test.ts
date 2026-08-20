import assert from "node:assert/strict";
import test from "node:test";
import { diagnosticarSesion, type EntornoDeSesion } from "./session-mode.ts";

/** Produccion bien configurada, y de ahi se va quitando cosas. */
const BIEN: EntornoDeSesion = { supabase: true, claveExplicita: true, oidc: false, produccion: true };

test("con base de datos y clave fija, la sesion dura 30 dias y no hay nada que arreglar", () => {
  const d = diagnosticarSesion(BIEN);
  assert.equal(d.modo, "PERSISTENTE");
  assert.equal(d.degradado, false);
  assert.equal(d.arreglo, null);
  assert.match(d.duracion, /30 días/);
});

test("el caso traicionero: sin clave fija pero con el token de Vercel", () => {
  const d = diagnosticarSesion({ ...BIEN, claveExplicita: false, oidc: true });
  assert.equal(d.modo, "CLAVE_INESTABLE");
  assert.equal(d.degradado, true);
  // Lo que importa es que diga POR QUE te echa, y que no es culpa de LALIGA.
  assert.match(d.explicacion, /cambia/);
  assert.match(d.explicacion, /No es un fallo de LALIGA/);
  assert.match(d.arreglo ?? "", /SESSION_ENCRYPTION_KEY/);
});

test("sin clave y sin token, tampoco se puede guardar", () => {
  const d = diagnosticarSesion({ ...BIEN, claveExplicita: false, oidc: false });
  assert.equal(d.modo, "CLAVE_INESTABLE");
  assert.equal(d.duracion, "no se puede guardar");
  assert.equal(d.degradado, true);
});

/**
 * Esto decia «dura 24 h y despues toca volver a entrar», y dejo de ser verdad en
 * cuanto la cookie empezo a renovarse sola con su propio refresh token. Seguia
 * saliendo en la pantalla de acceso, en amarillo, contandole a cada visitante un
 * problema que ya no existia — y encima con el nombre de dos variables de
 * entorno, a alguien que solo queria mirar su liga.
 */
test("sin base de datos la sesion se renueva sola y ya no es un aviso", () => {
  const d = diagnosticarSesion({ ...BIEN, supabase: false });
  assert.equal(d.modo, "SOLO_COOKIE");
  assert.equal(d.degradado, false, "ya no hay nada que avisar sobre la duracion");
  assert.equal(d.arreglo, null, "no se le enseñan variables de entorno a un usuario");
  assert.match(d.explicacion, /renueva sola/);
  assert.equal(/24 h|24 horas/.test(d.duracion + d.explicacion), false, "ya no caduca cada dia");
});

/**
 * El diagnostico mentia por omision.
 *
 * Sin Supabase salia `SOLO_COOKIE` y ahi se acababa: no habia forma de saber
 * desde fuera si ademas faltaba la clave de cifrado. Y esa clave es justo la
 * que decide si el enlace con Google puede recordarse, asi que en el despliegue
 * real —sin Supabase— la pregunta importante era invisible.
 */
test("el origen de la clave se dice siempre, aunque el modo se decida antes", () => {
  assert.equal(diagnosticarSesion({ ...BIEN, supabase: false }).clave, "explicita");
  assert.equal(
    diagnosticarSesion({ supabase: false, claveExplicita: false, oidc: true, produccion: true }).clave,
    "vercel",
  );
  assert.equal(
    diagnosticarSesion({ supabase: false, claveExplicita: false, oidc: false, produccion: true }).clave,
    "ninguna",
  );
});

test("una clave explicita gana al token de Vercel", () => {
  assert.equal(diagnosticarSesion({ ...BIEN, oidc: true }).clave, "explicita");
});

test("la falta de base de datos manda sobre la de clave: sin sitio donde guardar, la clave da igual", () => {
  const d = diagnosticarSesion({ supabase: false, claveExplicita: false, oidc: true, produccion: true });
  assert.equal(d.modo, "SOLO_COOKIE");
});

test("en local sin clave es lo esperado, no un problema", () => {
  const d = diagnosticarSesion({ supabase: false, claveExplicita: false, oidc: false, produccion: false });
  assert.equal(d.modo, "DESARROLLO");
  assert.equal(d.degradado, false);
  assert.equal(d.arreglo, null);
});

test("en local CON clave se diagnostica como produccion, para poder probarlo", () => {
  const d = diagnosticarSesion({ supabase: true, claveExplicita: true, oidc: false, produccion: false });
  assert.equal(d.modo, "PERSISTENTE");
});

test("ningun diagnostico degradado se queda sin decir que hacer", () => {
  const combinaciones: EntornoDeSesion[] = [];
  for (const supabase of [true, false]) {
    for (const claveExplicita of [true, false]) {
      for (const oidc of [true, false]) {
        for (const produccion of [true, false]) {
          combinaciones.push({ supabase, claveExplicita, oidc, produccion });
        }
      }
    }
  }
  for (const entorno of combinaciones) {
    const d = diagnosticarSesion(entorno);
    if (d.degradado) {
      assert.ok(d.arreglo, `${JSON.stringify(entorno)} está degradado y no dice cómo arreglarlo`);
    }
    // Y ninguno se queda sin explicacion, degradado o no.
    assert.ok(d.explicacion.length > 20, `${JSON.stringify(entorno)} sin explicación`);
  }
});
