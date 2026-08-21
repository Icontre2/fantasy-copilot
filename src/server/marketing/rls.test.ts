import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * El acceso protegido no es solo el `if` de `access.ts`: la propia tabla de
 * Supabase tiene que negarse igual si alguien hablara con PostgREST
 * directamente. Se comprueba contra el fichero de la migración, mismo
 * patrón que `auth/links.test.ts` con `fantasy_links`.
 */
const sql = readFileSync(new URL("../../../supabase/migrations/20260821_marketing_review_state.sql", import.meta.url), "utf8");

test("marketing_review_state tiene RLS activado", () => {
  assert.match(sql, /alter table public\.marketing_review_state enable row level security/);
});

test("hay política de select, insert y update — y ninguna de delete", () => {
  for (const operacion of ["for select", "for insert", "for update"]) {
    assert.equal(sql.toLowerCase().includes(operacion), true, `falta la política ${operacion}`);
  }
  assert.equal(sql.toLowerCase().includes("for delete"), false, "no debe existir política de delete: el audit trail no se borra");
});

test("todas las políticas usan la comprobación derivada, nunca una lista de correos en crudo", () => {
  const politicas = sql.match(/create policy[\s\S]*?;/g) ?? [];
  assert.ok(politicas.length >= 3, "se esperaban al menos 3 políticas (select/insert/update)");
  for (const politica of politicas) {
    assert.match(politica, /es_admin_de_marketing\(\)/);
  }
});

test("app_secrets no concede nada directamente a anon ni a authenticated", () => {
  assert.match(sql, /revoke all on public\.app_secrets from anon, authenticated/);
});

test("es_admin_de_marketing() es security definer y solo authenticated puede llamarla", () => {
  assert.match(sql, /create or replace function public\.es_admin_de_marketing\(\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /revoke all on function public\.es_admin_de_marketing\(\) from public, anon/);
  assert.match(sql, /grant execute on function public\.es_admin_de_marketing\(\) to authenticated/);
});
