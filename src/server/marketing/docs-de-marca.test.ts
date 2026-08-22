import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Que los documentos de marca no se contradigan entre sí.
 *
 * ── Por qué esto merece un test ─────────────────────────────────────────────
 * `IMAGE_PIPELINE.md` §3-§4 prescribía acento morado «heredado del producto»
 * para el arte generado, mientras `CONTENT_RULES.md:10` y `BRAND.md:17` dan el
 * rojo al marketing. La contradicción no la detectó nadie leyendo: la
 * encontró un Creative Director en mitad de una pieza real, y costó una
 * deliberación entera resolverla. Sin esto, cada pieza la habría vuelto a
 * discutir desde cero.
 *
 * La regla que quedó: el rojo es la frontera. Rojo = lo generamos nosotros,
 * morado = es una captura real del producto y no se toca.
 */

const RAIZ = fileURLToPath(new URL("../../..", import.meta.url));
const leer = (ruta: string) => readFile(path.join(RAIZ, ruta), "utf8");

/** El bloque de prompt del §4, que es lo que de verdad se le pasa a un modelo. */
async function promptBase(): Promise<string> {
  const texto = await leer("marketing/IMAGE_PIPELINE.md");
  const seccion = texto.slice(texto.indexOf("## 4."), texto.indexOf("## 5."));
  const bloque = /```\n([\s\S]*?)```/.exec(seccion);
  assert.ok(bloque, "el §4 tiene que seguir teniendo un bloque de prompt");
  return bloque[1];
}

test("el prompt base no pide morado: el arte generado va en rojo de marca", async () => {
  const prompt = await promptBase();
  assert.equal(/morad|8b5cf6|7c3aed/i.test(prompt), false, "el morado es del producto, no del arte generado");
  assert.match(prompt, /rojo/i, "el acento del marketing es el rojo de marca");
});

test("el prompt base prohíbe generar interfaz, no solo la prosa que lo rodea", async () => {
  // La prohibición vivía solo en el §5. Un modelo no lee el §5.
  const prompt = await promptBase();
  assert.match(prompt, /PROHIBIDO generar interfaz/i);
  assert.match(prompt, /capturas reales/i);
});

/** Las filas de una tabla markdown dentro del tramo dado. */
function filasDeTabla(texto: string, desde: string, hasta: string): string[] {
  const tramo = texto.slice(texto.indexOf(desde), texto.indexOf(hasta));
  return tramo.split("\n").filter((l) => l.trimStart().startsWith("|"));
}

test("el acento de marketing se nombra, no se fija con un hex", async () => {
  // `BRAND.md:17` nombra el rojo pero no lo fija en ninguna parte del repo.
  // Escribir aquí un hex plausible es como se acaba teniendo tres rojos
  // distintos. El fondo sí lleva hex, y está bien: ese sí existe en el CSS.
  const texto = await leer("marketing/IMAGE_PIPELINE.md");
  const acento = filasDeTabla(texto, "### Marketing", "### Producto").find((l) => /Acento/.test(l));

  assert.ok(acento, "la tabla de marketing tiene que seguir teniendo una fila de acento");
  assert.match(acento, /[Rr]ojo/, "el acento del marketing es el rojo de marca");
  assert.equal(/#[0-9a-fA-F]{6}/.test(acento), false, `el rojo se pide por su nombre hasta que identidad lo fije: ${acento.trim()}`);
});

test("los colores que el documento atribuye al producto existen en el producto", async () => {
  // El `#e0b458` que figuraba como «Aviso» no estaba en ninguna parte de la
  // app: un color que no existe en el producto no es la paleta del producto.
  const pipeline = await leer("marketing/IMAGE_PIPELINE.md");
  const css = await leer("app/globals.css");
  const trend = await leer("app/fantasy/trend.ts");

  // Solo las FILAS de la tabla: la prosa de alrededor explica qué colores se
  // retiraron y por qué, y nombrarlos ahí no es atribuírselos al producto.
  const filas = filasDeTabla(pipeline, "### Producto", "**Prohibido:**");
  const hexes = filas.flatMap((f) => [...f.matchAll(/#([0-9a-fA-F]{6})/g)].map((m) => m[1].toLowerCase()));
  assert.ok(hexes.length > 0, "la tabla de producto tiene que seguir listando colores");
  for (const hex of hexes) {
    const existe = `${css}${trend}`.toLowerCase().includes(hex);
    assert.ok(existe, `IMAGE_PIPELINE atribuye #${hex} al producto, pero no aparece en app/globals.css ni en app/fantasy/trend.ts`);
  }
});

test("las reglas de marca sobre captura y rojo siguen donde el pipeline dice", async () => {
  const reglas = await leer("brand/CONTENT_RULES.md");
  assert.match(reglas, /rojo de marca se usa en marketing/i, "CONTENT_RULES:10 es la norma que decide el color del marketing");
  assert.match(reglas, /no se recolorea, reconstruye ni redise/i, "CONTENT_RULES:9 es la que protege la captura real");
});
