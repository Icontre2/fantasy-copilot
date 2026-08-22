import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * "Ningún botón de este panel publica en una red externa" — el último de
 * los tests obligatorios, y el único que no es una regla de negocio sino una
 * garantía sobre TODO el código del panel a la vez. Se comprueba escaneando
 * el código en vez de "confiar en que nadie lo añadió": si algún día alguien
 * mete una llamada a la API de TikTok/Instagram/YouTube o usa
 * `PublisherAdapter` fuera de su propio fichero, esto rompe en rojo.
 */

const RAIZ = fileURLToPath(new URL("../../..", import.meta.url));

async function ficherosBajo(carpeta: string): Promise<string[]> {
  const entradas = await readdir(carpeta, { withFileTypes: true }).catch(() => []);
  const rutas: string[] = [];
  for (const entrada of entradas) {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) rutas.push(...(await ficherosBajo(ruta)));
    else if (/\.(ts|tsx)$/.test(entrada.name)) rutas.push(ruta);
  }
  return rutas;
}

const PROHIBIDO =
  /PublisherAdapter|tiktok\.(com|org)|graph\.facebook\.com|graph\.instagram\.com|googleapis\.com\/youtube|youtube\.com\/upload/i;

test("ninguna ruta de la API ni componente del panel referencia una publicación externa", async () => {
  const carpetas = [
    path.join(RAIZ, "app/api/marketing"),
    path.join(RAIZ, "app/marketing"),
  ];

  for (const carpeta of carpetas) {
    for (const fichero of await ficherosBajo(carpeta)) {
      const texto = await readFile(fichero, "utf8");
      assert.equal(PROHIBIDO.test(texto), false, `${path.relative(RAIZ, fichero)} referencia algo de publicación externa`);
    }
  }
});

test("service.ts (el único punto que llaman las rutas) no importa ningún adapter", async () => {
  const texto = await readFile(path.join(RAIZ, "src/server/marketing/service.ts"), "utf8");
  assert.equal(/from ['"]\.\/adapters/.test(texto), false, "service.ts no debería depender de adapters.ts todavía");
});

test("actions.ts (las transiciones de estado) no importa ningún adapter", async () => {
  const texto = await readFile(path.join(RAIZ, "src/server/marketing/actions.ts"), "utf8");
  assert.equal(/from ['"]\.\/adapters/.test(texto), false);
});

test("aprobar (actions.ts) solo cambia `status`, nunca llama a publicar", async () => {
  const texto = await readFile(path.join(RAIZ, "src/server/marketing/actions.ts"), "utf8");
  const cuerpoDeAprobar = texto.slice(texto.indexOf("export function aprobar"), texto.indexOf("export function rechazar"));
  assert.match(cuerpoDeAprobar, /status: 'approved'/);
  assert.equal(/publicar|publish/i.test(cuerpoDeAprobar), false);
});

test("PublisherAdapter existe como interfaz (fase 9) pero su implementación por defecto solo lanza", async () => {
  const texto = await readFile(path.join(RAIZ, "src/server/marketing/adapters.ts"), "utf8");
  assert.match(texto, /export interface PublisherAdapter/);
  const cuerpoDelStub = texto.slice(
    texto.indexOf("class PublisherAdapterPendiente"),
    texto.indexOf("// ── Analítica"),
  );
  assert.match(cuerpoDelStub, /throw new AdapterNoConectado/);
  // Nada de `fetch(`, `axios`, ni ningún cliente HTTP dentro del stub.
  assert.equal(/fetch\(|axios|XMLHttpRequest/.test(cuerpoDelStub), false);
});

/**
 * Lo que corre fuera de la app.
 *
 * El escaneo de arriba solo miraba `app/**`, que era todo lo que existía cuando
 * se escribió. Desde entonces hay scripts que ejecutan la pipeline y un
 * workflow que la lanza sola cada día — y un `curl` a la API de TikTok metido
 * en un `run:` de YAML publicaría exactamente igual que uno metido en un
 * componente de React, sin que ningún test se enterase.
 */
test("ni los scripts de marketing ni los workflows publican en una red externa", async () => {
  const ficheros = [
    ...(await ficherosBajo(path.join(RAIZ, "scripts/marketing"))),
    ...(await readdir(path.join(RAIZ, ".github/workflows")).catch(() => []))
      .filter((f) => /\.ya?ml$/.test(f))
      .map((f) => path.join(RAIZ, ".github/workflows", f)),
  ];

  assert.ok(ficheros.length > 0, "el escaneo tiene que estar mirando algo");

  for (const fichero of ficheros) {
    const texto = await readFile(fichero, "utf8");
    assert.equal(PROHIBIDO.test(texto), false, `${path.relative(RAIZ, fichero)} referencia algo de publicación externa`);
  }
});

/**
 * La tanda diaria abre una PR; no empuja a `main`. Si algún día alguien le
 * quita ese paso, el gate humano —«nada pasa a generated ni a published sin
 * aprobación explícita»— se salta sin que nadie lo note.
 */
test("la tanda diaria no puede empujar a main", async () => {
  const ruta = path.join(RAIZ, ".github/workflows/marketing-daily.yml");
  const texto = await readFile(ruta, "utf8").catch(() => null);
  if (texto === null) return; // el workflow es opcional; si no está, no hay nada que comprobar

  assert.match(texto, /gh pr create/, "la tanda entrega su trabajo abriendo una PR");
  assert.equal(/push[^\n]*origin\s+(main|HEAD:main)/.test(texto), false, "nada de empujar a main");
  assert.equal(/gh pr merge|--auto|--admin/.test(texto), false, "y menos aún fusionarla sola");
});
