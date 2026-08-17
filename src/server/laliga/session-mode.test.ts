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

test("sin base de datos la sesion vive en la cookie y dura un dia", () => {
  const d = diagnosticarSesion({ ...BIEN, supabase: false });
  assert.equal(d.modo, "SOLO_COOKIE");
  assert.equal(d.degradado, true);
  assert.match(d.duracion, /24 h/);
  assert.match(d.arreglo ?? "", /SUPABASE_URL/);
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
