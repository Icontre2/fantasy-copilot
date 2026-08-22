import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { DOCUMENTOS_POR_ESPECIALISTA } from "./policy.ts";

/**
 * Los siete ficheros de `.claude/agents/` son lo que Claude lee de verdad al
 * invocar un subagente. Un frontmatter mal escrito no da error: el agente
 * simplemente no se detecta, o se detecta con permisos que no queríamos. Esto
 * lo comprueba en cada `npm test`.
 *
 * Es el mismo tipo de canario que `paquetes-reales.test.ts`: recorre los
 * ficheros REALES, no fixtures, porque el fallo que importa es el del fichero
 * que se despliega.
 */

const RAIZ = fileURLToPath(new URL("../../../..", import.meta.url));
const CARPETA = path.join(RAIZ, ".claude", "agents");

const ESPECIALISTAS = ["strategist", "copywriter", "creative-director", "video-director", "brand-reviewer"] as const;
const TODOS = ["orchestrator", ...ESPECIALISTAS] as const;

type Frontmatter = { name: string; description: string; tools: string[] };

async function leerFrontmatter(agente: string): Promise<Frontmatter> {
  const texto = await readFile(path.join(CARPETA, `${agente}.md`), "utf8");
  const bloque = /^---\n([\s\S]*?)\n---\n/.exec(texto);
  assert.ok(bloque, `${agente}.md no empieza con un bloque de frontmatter`);

  const campos = new Map<string, string>();
  for (const linea of bloque[1].split("\n")) {
    const separador = linea.indexOf(":");
    if (separador === -1) continue;
    campos.set(linea.slice(0, separador).trim(), linea.slice(separador + 1).trim());
  }

  const name = campos.get("name");
  const description = campos.get("description");
  const tools = campos.get("tools");
  assert.ok(name, `${agente}.md: falta \`name\``);
  assert.ok(description, `${agente}.md: falta \`description\``);
  assert.ok(tools, `${agente}.md: falta \`tools\``);

  return { name, description, tools: tools.split(",").map((t) => t.trim()).filter(Boolean) };
}

test("existen los siete ficheros y ninguno de más", async () => {
  const encontrados = (await readdir(CARPETA)).filter((f) => f.endsWith(".md")).sort();
  assert.deepEqual(encontrados, [...TODOS].map((a) => `${a}.md`).concat("README.md").sort());
});

test("cada agente tiene frontmatter válido y su `name` coincide con el fichero", async () => {
  for (const agente of TODOS) {
    const fm = await leerFrontmatter(agente);
    assert.equal(fm.name, agente, `${agente}.md declara name: ${fm.name}`);
    assert.ok(fm.description.length > 40, `${agente}.md: la descripción decide cuándo Claude lo invoca; hazla explícita`);
  }
});

test("solo el Orchestrator puede escribir", async () => {
  const orquestador = await leerFrontmatter("orchestrator");
  assert.ok(orquestador.tools.includes("Write"), "el Orchestrator es quien crea los ficheros finales");
  assert.ok(orquestador.tools.includes("Edit"));

  for (const especialista of ESPECIALISTAS) {
    const fm = await leerFrontmatter(especialista);
    for (const prohibida of ["Write", "Edit", "NotebookEdit"]) {
      assert.equal(fm.tools.includes(prohibida), false, `${especialista} no debe poder escribir (${prohibida})`);
    }
  }
});

test("ningún agente puede ejecutar comandos ni salir a la red", async () => {
  // `Bash` permitiría saltarse la restricción de escritura por la puerta de
  // atrás; `WebFetch`/`WebSearch` convertirían a un especialista en una fuente
  // de hechos sin evidencia trazable, que es justo lo que el sistema prohíbe.
  for (const agente of TODOS) {
    const fm = await leerFrontmatter(agente);
    for (const prohibida of ["Bash", "WebFetch", "WebSearch", "Task"]) {
      assert.equal(fm.tools.includes(prohibida), false, `${agente} no debería tener ${prohibida}`);
    }
  }
});

test("los especialistas tienen exactamente las herramientas de lectura", async () => {
  for (const especialista of ESPECIALISTAS) {
    const fm = await leerFrontmatter(especialista);
    assert.deepEqual(fm.tools.sort(), ["Glob", "Grep", "Read"], `${especialista}: permisos mínimos`);
  }
});

test("toda ruta del repo que citan los agentes existe de verdad", async () => {
  // El documento maestro menciona `brand/BRAND_SYSTEM.md`,
  // `marketing/PRELAUNCH_CONTENT.md` y `marketing/editorial-queue.json`, que
  // hoy NO existen. Pedirle a un agente que lea un fichero inexistente le hace
  // fallar la lectura o, peor, rellenar el hueco por su cuenta.
  const patron = /`((?:brand|marketing|src|agents|scripts)\/[\w./[\]<>-]+)`/g;

  for (const agente of [...TODOS, "README"]) {
    const texto = await readFile(path.join(CARPETA, `${agente}.md`), "utf8");
    for (const [, ruta] of texto.matchAll(patron)) {
      if (/[<>]/.test(ruta)) continue; // plantillas como marketing/generated/<fecha>/
      const existe = await access(path.join(RAIZ, ruta)).then(() => true).catch(() => false);
      assert.ok(existe, `${agente}.md cita \`${ruta}\`, que no existe en el repositorio`);
    }
  }
});

test("los documentos de los context packets existen", async () => {
  for (const [especialista, documentos] of Object.entries(DOCUMENTOS_POR_ESPECIALISTA)) {
    for (const documento of documentos) {
      const existe = await access(path.join(RAIZ, documento)).then(() => true).catch(() => false);
      assert.ok(existe, `el context packet de ${especialista} incluye ${documento}, que no existe`);
    }
  }
});

test("ningún agente menciona publicar en una red externa", async () => {
  const prohibido = /\b(publica(r|remos)?|postea(r)?)\s+(en\s+)?(tiktok|instagram|youtube)\b/i;
  for (const agente of [...TODOS, "README"]) {
    const texto = await readFile(path.join(CARPETA, `${agente}.md`), "utf8");
    const lineas = texto.split("\n").filter((l) => prohibido.test(l) && !/nunca|no\s|sin\s|manual/i.test(l));
    assert.deepEqual(lineas, [], `${agente}.md parece autorizar publicación externa`);
  }
});

test("el Orchestrator declara que solo escribe bajo marketing/generated", async () => {
  const texto = await readFile(path.join(CARPETA, "orchestrator.md"), "utf8");
  assert.match(texto, /marketing\/generated/);
  assert.match(texto, /ni UI, ni backend/i, "tiene que decir explícitamente qué no toca");
});
