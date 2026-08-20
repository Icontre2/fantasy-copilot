import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { identidadDeUsuario, PREFIJO_SUPABASE, puedeGuardarEnlace } from "./links.ts";

/**
 * El identificador de fila y la política de la base tienen que decir LO MISMO.
 *
 * Son dos ficheros que no se hablan: uno en TypeScript, otro en SQL dentro de
 * Postgres. Si alguien cambia el prefijo aquí, la política deja de casar y el
 * síntoma no es un error, es que «entrar con Google» vuelve a pedir la
 * contraseña de LALIGA — exactamente el fallo que este trabajo arregla, y sin
 * una sola línea en ningún log.
 */
test("el identificador lleva el prefijo que espera la base", () => {
  assert.equal(identidadDeUsuario("6b1f2c30-0000-4000-8000-000000000001"), "supabase:6b1f2c30-0000-4000-8000-000000000001");
});

test("la política de la base usa exactamente ese prefijo", () => {
  const sql = readFileSync(new URL("../../../supabase/migrations/20260820_fantasy_links_rls.sql", import.meta.url), "utf8");
  const esperado = `id = '${PREFIJO_SUPABASE}' || (select auth.uid())::text`;
  assert.equal(sql.includes(esperado), true, `la migración ya no ata «${esperado}»`);

  // Y las cuatro operaciones, porque con solo `select` se puede leer pero no
  // enlazar, que es la mitad inútil.
  for (const operacion of ["for select", "for insert", "for update", "for delete"]) {
    assert.equal(sql.includes(operacion), true, `falta la política ${operacion}`);
  }
});

/**
 * Cuándo tiene sentido guardar el enlace.
 *
 * La regla no es «hay dónde guardar» sino «la clave con la que se cifra sigue
 * siendo la misma mañana». Con la de Vercel, que rota en cada despliegue, la
 * fila quedaría ilegible y el usuario vería «ya conectaste LALIGA» sin poder
 * entrar: peor que no haber guardado nada.
 */
test("en producción hace falta una clave fija", () => {
  assert.equal(puedeGuardarEnlace({ claveExplicita: true, produccion: true }), true);
  assert.equal(puedeGuardarEnlace({ claveExplicita: false, produccion: true }), false);
});

test("en local se guarda igual, aunque la clave muera con el proceso", () => {
  assert.equal(puedeGuardarEnlace({ claveExplicita: false, produccion: false }), true);
  assert.equal(puedeGuardarEnlace({ claveExplicita: true, produccion: false }), true);
});
