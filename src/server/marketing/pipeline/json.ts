// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import type { z } from 'zod';
import type { LlamadaClaude, UsoDeTokens } from './claude.ts';

/**
 * "Pídele JSON a Claude que valide contra este schema", con un reintento.
 *
 * Separado de `claude.ts` a propósito: recibe la función de llamada como
 * parámetro (`LlamadaClaude`), nunca importa el SDK. Así esta lógica —la que
 * de verdad puede tener un error— se prueba con una función de mentira, sin
 * red y sin coste, en `json.test.ts`.
 */

const INSTRUCCION_JSON =
  'Responde ÚNICAMENTE con un objeto JSON válido. Nada de texto antes ni después, nada de explicación, nada de bloques de código markdown — solo las llaves.';

export type PeticionJSON<T> = {
  model: string;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
};

export type ResultadoJSON<T> = { data: T; usage: UsoDeTokens };

export async function pedirJSON<T>(llamar: LlamadaClaude, peticion: PeticionJSON<T>): Promise<ResultadoJSON<T>> {
  const systemCompleto = `${peticion.system}\n\n${INSTRUCCION_JSON}`;
  const usoAcumulado: UsoDeTokens = { inputTokens: 0, outputTokens: 0 };

  const primero = await llamar({ model: peticion.model, system: systemCompleto, prompt: peticion.prompt, maxTokens: peticion.maxTokens });
  acumular(usoAcumulado, primero.usage);
  const validadoPrimero = validar(primero.texto, peticion.schema);
  if (validadoPrimero.ok) return { data: validadoPrimero.data, usage: usoAcumulado };

  // Un único reintento: se le devuelve el error exacto para que se corrija.
  // Más de uno arriesga un loop que quema tokens sin arreglar nada — si
  // falla dos veces, es mejor que la pieza salga `blocked` y lo vea una
  // persona, que insistir en gastar más.
  const promptDeCorreccion = [
    'Tu respuesta anterior no es JSON válido según lo pedido.',
    `Error: ${validadoPrimero.error}`,
    'Respuesta anterior:',
    primero.texto,
    'Corrígela.',
    INSTRUCCION_JSON,
  ].join('\n\n');

  const segundo = await llamar({ model: peticion.model, system: systemCompleto, prompt: promptDeCorreccion, maxTokens: peticion.maxTokens });
  acumular(usoAcumulado, segundo.usage);
  const validadoSegundo = validar(segundo.texto, peticion.schema);
  if (validadoSegundo.ok) return { data: validadoSegundo.data, usage: usoAcumulado };

  throw new Error(`No se pudo obtener JSON válido tras un reintento: ${validadoSegundo.error}`);
}

function acumular(total: UsoDeTokens, nuevo: UsoDeTokens): void {
  total.inputTokens += nuevo.inputTokens;
  total.outputTokens += nuevo.outputTokens;
}

type Validacion<T> = { ok: true; data: T } | { ok: false; error: string };

function validar<T>(texto: string, schema: z.ZodType<T>): Validacion<T> {
  const limpio = extraerJSON(texto);
  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch (error) {
    return { ok: false, error: `JSON.parse falló: ${(error as Error).message}` };
  }
  const validado = schema.safeParse(json);
  if (!validado.success) {
    const detalle = validado.error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`).join('; ');
    return { ok: false, error: detalle };
  }
  return { ok: true, data: validado.data };
}

/** Por si el modelo mete el JSON en un bloque ```json pese a la instrucción. */
function extraerJSON(texto: string): string {
  const bloque = /```(?:json)?\s*([\s\S]*?)```/i.exec(texto);
  return (bloque ? bloque[1] : texto).trim();
}
