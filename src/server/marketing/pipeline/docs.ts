// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Lee los documentos que cada etapa tiene que "leer primero" y los concatena
 * en un único bloque de contexto, cada uno con su ruta como cabecera — así el
 * prompt del sistema es trazable a un fichero real del repositorio, nunca
 * texto inventado a mano por esta pipeline.
 */

/**
 * Quita el frontmatter YAML de un `.claude/agents/*.md`.
 *
 * Ese bloque (`name`, `description`, `tools`) le dice a Claude Code cuándo
 * invocar el subagente y con qué permisos. Como contexto de una llamada a la
 * API no significa nada: lo único que haría es gastar tokens y sugerirle al
 * modelo que tiene herramientas que en esta ruta no existen.
 */
function sinFrontmatter(texto: string): string {
  return texto.replace(/^---\n[\s\S]*?\n---\n/, '');
}

/**
 * Se queda con la parte de ROL de un agente y descarta su contrato de salida.
 *
 * ── Por qué hay que cortar por aquí ─────────────────────────────────────────
 * Un mismo agente se invoca de dos maneras, y cada una espera una forma de
 * salida distinta:
 *
 *   - Como subagente de Claude Code, devuelve el contrato del documento
 *     maestro (`best_hook`, `spoken_script`, `ctas`…), que es lo que valida
 *     `src/server/marketing/agents/contracts.ts`.
 *   - Como etapa de esta pipeline, devuelve los campos de `PaqueteCrudo`
 *     (`hook`, `script`, `cta`…), que es lo que valida `stages.ts` y lo que
 *     permite guardar el `package.json` sin ninguna traducción intermedia.
 *
 * La misión, las reglas y las prohibiciones son las mismas en los dos casos —
 * y eso es justo lo que estaba duplicado entre `agents/` y `.claude/agents/`.
 * El contrato NO lo es. Cargar el fichero entero como contexto le daría a cada
 * etapa dos especificaciones de salida contradictorias, y la que manda aquí es
 * la de `stages.ts`, que va en el prompt de usuario.
 *
 * Por eso el corte es en `## Devuelves`: todo lo anterior es el rol, y es lo
 * que se comparte. `agents-reales.test.ts` comprueba que cada especialista
 * tiene exactamente una sección así, para que este corte no falle en silencio.
 */
export function soloElRol(texto: string): string {
  const limpio = sinFrontmatter(texto);
  const corte = limpio.search(/^## Devuelves$/m);
  return (corte === -1 ? limpio : limpio.slice(0, corte)).trim();
}

/** Ruta del subagente `nombre` dentro de `.claude/agents/`. */
export function rutaDeAgente(nombre: string): string {
  return path.join('.claude', 'agents', `${nombre}.md`);
}

/**
 * Concatena documentos estáticos. Los de `.claude/agents/` pasan por
 * `soloElRol`; el resto se cargan enteros.
 */
export async function leerDocs(raiz: string, rutas: string[]): Promise<string> {
  const partes = await Promise.all(
    rutas.map(async (ruta) => {
      const texto = await readFile(path.join(raiz, ruta), 'utf8');
      const contenido = ruta.includes(`.claude${path.sep}agents`) || ruta.includes('.claude/agents') ? soloElRol(texto) : texto.trim();
      return `## ${ruta}\n\n${contenido}`;
    }),
  );
  return partes.join('\n\n---\n\n');
}
