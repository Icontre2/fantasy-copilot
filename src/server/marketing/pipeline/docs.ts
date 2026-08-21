// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Lee los documentos que cada agente tiene que "leer primero"
 * (`agents/*.md` lo dice explícitamente) y los concatena en un único bloque
 * de contexto, cada uno con su ruta como cabecera — así el prompt del
 * sistema es trazable a un fichero real del repositorio, nunca texto
 * inventado a mano por esta pipeline.
 */
export async function leerDocs(raiz: string, rutas: string[]): Promise<string> {
  const partes = await Promise.all(
    rutas.map(async (ruta) => {
      const texto = await readFile(path.join(raiz, ruta), 'utf8');
      return `## ${ruta}\n\n${texto.trim()}`;
    }),
  );
  return partes.join('\n\n---\n\n');
}
