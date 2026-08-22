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
const SKILL_ORCHESTRATOR = path.join(RAIZ, ".claude", "skills", "orquestar-pieza", "SKILL.md");

/*
 * El Orchestrator NO está aquí, y no es un descuido.
 *
 * Estuvo en `.claude/agents/orchestrator.md` y no funcionaba: un subagente no
 * puede invocar a otro subagente, así que se quedaba sin poder consultar a
 * ningún especialista y abortaba en cada ejecución — se comprobó ejecutándolo.
 * Vive ahora como skill (`.claude/skills/orquestar-pieza/`), que corre en la
 * sesión principal y sí puede lanzarlos.
 */
const ESPECIALISTAS = ["strategist", "copywriter", "creative-director", "video-director", "brand-reviewer"] as const;
const TODOS = ESPECIALISTAS;

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

test("en .claude/agents/ están los cinco especialistas y ninguno más", async () => {
  const encontrados = (await readdir(CARPETA)).filter((f) => f.endsWith(".md")).sort();
  assert.deepEqual(encontrados, [...TODOS].map((a) => `${a}.md`).concat("README.md").sort());
});

test("el Orchestrator es una skill, no un agente", async () => {
  // Si alguien lo devuelve a `.claude/agents/`, vuelve a quedarse sin poder
  // invocar especialistas y aborta en cada ejecución.
  const comoAgente = await access(path.join(CARPETA, "orchestrator.md")).then(() => true).catch(() => false);
  assert.equal(comoAgente, false, "orchestrator.md no puede vivir en .claude/agents/: como subagente no puede invocar a nadie");

  const texto = await readFile(SKILL_ORCHESTRATOR, "utf8");
  assert.match(texto, /^---$/m, "la skill necesita frontmatter");
  assert.match(texto, /^name: orquestar-pieza$/m, "y que su nombre coincida con la carpeta");
  assert.match(texto, /marketing\/generated/, "tiene que decir dónde puede escribir");
  assert.match(texto, /ni UI, ni backend/i, "y qué no toca");
});

test("cada agente tiene frontmatter válido y su `name` coincide con el fichero", async () => {
  for (const agente of TODOS) {
    const fm = await leerFrontmatter(agente);
    assert.equal(fm.name, agente, `${agente}.md declara name: ${fm.name}`);
    assert.ok(fm.description.length > 40, `${agente}.md: la descripción decide cuándo Claude lo invoca; hazla explícita`);
  }
});

test("ningún especialista puede escribir: el único que crea ficheros es el Orchestrator", async () => {
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

  for (const fichero of [...[...TODOS, "README"].map((a) => path.join(CARPETA, `${a}.md`)), SKILL_ORCHESTRATOR]) {
    const texto = await readFile(fichero, "utf8");
    for (const [, ruta] of texto.matchAll(patron)) {
      if (/[<>]/.test(ruta)) continue; // plantillas como marketing/generated/<fecha>/
      const existe = await access(path.join(RAIZ, ruta)).then(() => true).catch(() => false);
      assert.ok(existe, `${path.relative(RAIZ, fichero)} cita \`${ruta}\`, que no existe en el repositorio`);
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
  for (const fichero of [...[...TODOS, "README"].map((a) => path.join(CARPETA, `${a}.md`)), SKILL_ORCHESTRATOR]) {
    const texto = await readFile(fichero, "utf8");
    const lineas = texto.split("\n").filter((l) => prohibido.test(l) && !/nunca|no\s|sin\s|manual/i.test(l));
    assert.deepEqual(lineas, [], `${path.relative(RAIZ, fichero)} parece autorizar publicación externa`);
  }
});


