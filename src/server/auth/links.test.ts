import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { identidadDeUsuario, PREFIJO_SUPABASE, uuidDeIdentidad } from "./links.ts";

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
 * El camino de vuelta: de la identidad al `uuid`.
 *
 * Lo usa el atajo administrativo para poder pedirle a la base la clave de esa
 * persona. Si aquí se colara cualquier cosa, se estaría mandando texto libre a
 * una función de la base como si fuera un identificador.
 */
test("del identificador se saca el uuid, y solo si lo es", () => {
  assert.equal(
    uuidDeIdentidad("supabase:6b1f2c30-0000-4000-8000-000000000001"),
    "6b1f2c30-0000-4000-8000-000000000001",
  );
  assert.equal(uuidDeIdentidad("google:1076915035"), null, "otro proveedor no es un uuid de Supabase");
  assert.equal(uuidDeIdentidad("supabase:"), null);
  assert.equal(uuidDeIdentidad("supabase:no-es-un-uuid"), null);
  assert.equal(uuidDeIdentidad("supabase:'; drop table fantasy_links; --"), null);
});
