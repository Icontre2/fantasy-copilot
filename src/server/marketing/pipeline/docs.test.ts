import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { leerDocs, rutaDeAgente, soloElRol } from "./docs.ts";

/**
 * `soloElRol` es lo que permite que exista UN solo fichero por agente.
 *
 * Los mismos seis agentes vivían duplicados en `agents/` (prompts de la
 * pipeline) y en `.claude/agents/` (subagentes de Claude Code). Se puede
 * unificar porque la misión y las reglas son idénticas; lo que NO se puede
 * unificar es el contrato de salida, que depende de quién invoca. Este corte
 * es lo que separa una cosa de la otra.
 */

const RAIZ = fileURLToPath(new URL("../../../..", import.meta.url));
const ESPECIALISTAS = ["strategist", "copywriter", "creative-director", "video-director", "brand-reviewer"] as const;

test("quita el frontmatter: no es contexto, son permisos de Claude Code", () => {
  const rol = soloElRol("---\nname: x\ntools: Read\n---\nEres el agente.\n");
  assert.equal(rol, "Eres el agente.");
});

test("corta en `## Devuelves` y conserva todo lo anterior", () => {
  const rol = soloElRol("---\nname: x\n---\nMisión.\n\n## Reglas\n\nNo inventes.\n\n## Devuelves\n\n`best_hook`, `ctas`.\n");
  assert.match(rol, /Misión/);
  assert.match(rol, /No inventes/, "las reglas son la parte que se comparte");
  assert.equal(/best_hook/.test(rol), false, "el contrato del subagente contradiría el de stages.ts");
});

test("un documento sin `## Devuelves` se conserva entero", () => {
  assert.equal(soloElRol("Solo misión y reglas."), "Solo misión y reglas.");
});

test("cada especialista real tiene exactamente una sección `## Devuelves`", async () => {
  // Si alguien añade una segunda, el corte se llevaría por delante contenido
  // que sí es rol. Si la quita, el contrato entraría en el prompt de la
  // pipeline y contradiría a `stages.ts`.
  for (const agente of ESPECIALISTAS) {
    const texto = await readFile(path.join(RAIZ, rutaDeAgente(agente)), "utf8");
    const secciones = texto.match(/^## Devuelves$/gm) ?? [];
    assert.equal(secciones.length, 1, `${agente}.md tiene ${secciones.length} secciones \`## Devuelves\``);
  }
});

test("el rol de cada especialista real sobrevive al corte y el contrato no", async () => {
  for (const agente of ESPECIALISTAS) {
    const texto = await readFile(path.join(RAIZ, rutaDeAgente(agente)), "utf8");
    const rol = soloElRol(texto);

    assert.ok(rol.length > 200, `${agente}: el rol se ha quedado en nada tras el corte`);
    assert.equal(/^---/.test(rol), false, `${agente}: sigue llevando frontmatter`);
    assert.equal(/salida\w*Schema/.test(rol), false, `${agente}: el contrato no debe llegar a la pipeline`);
  }
});

test("leerDocs recorta los agentes pero no los demás documentos", async () => {
  const juntos = await leerDocs(RAIZ, ["brand/VOICE.md", rutaDeAgente("copywriter")]);

  assert.match(juntos, /## brand\/VOICE\.md/, "cada documento va con su ruta, para que sea trazable");
  assert.match(juntos, /## \.claude\/agents\/copywriter\.md/);
  assert.equal(/^---\nname: copywriter/m.test(juntos), false, "el frontmatter del agente no viaja al prompt");
  assert.equal(/claims_needing_validation/.test(juntos), false, "ni su contrato de salida");
});

test("rutaDeAgente apunta dentro de .claude/agents", () => {
  assert.equal(rutaDeAgente("strategist"), path.join(".claude", "agents", "strategist.md"));
});
