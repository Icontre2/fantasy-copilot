import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { RegistroDeEjecucion } from './policy.ts';

const especialistaSchema = z.enum(['strategist', 'copywriter', 'creative-director', 'video-director', 'brand-reviewer']);

export const registroDeEjecucionSchema = z.object({
  run_id: z.string().min(1),
  timestamp: z.string().datetime(),
  opportunity_id: z.string().nullable(),
  agentes_invocados: z.array(especialistaSchema),
  reintentos: z.number().int().nonnegative(),
  reviewer_verdict: z.enum(['PASS', 'FIX', 'BLOCK']).nullable(),
  autocorrection_used: z.boolean(),
  final_status: z.enum(['pending_approval', 'blocked', 'review_pending']),
  content_id: z.string().nullable(),
  source: z.enum(['sdk-pipeline', 'claude-code-skill']),
  error: z.string().nullable().optional(),
});

export type RegistroPersistido = RegistroDeEjecucion & z.infer<typeof registroDeEjecucionSchema>;

/**
 * Persiste una traza de ejecución bajo marketing/generated/_runs/.
 *
 * Vive deliberadamente dentro de generated: la misma frontera técnica que
 * protege al Orchestrator permite escribir aquí incluso cuando la ejecución
 * aborta antes de crear una carpeta de pieza.
 */
export async function guardarRegistroDeEjecucion(
  registro: z.input<typeof registroDeEjecucionSchema>,
  raiz = process.cwd(),
): Promise<string> {
  const validado = registroDeEjecucionSchema.parse(registro);
  const carpeta = path.join(raiz, 'marketing', 'generated', '_runs');
  await mkdir(carpeta, { recursive: true });

  // El run_id puede venir de una sesión externa: se sanea para que nunca pueda
  // convertirse en una ruta relativa o escapar de _runs.
  const nombreSeguro = validado.run_id.replace(/[^a-zA-Z0-9._-]/g, '_');
  const destino = path.join(carpeta, `${nombreSeguro}.json`);
  const relativo = path.relative(carpeta, destino);
  if (relativo.startsWith('..') || path.isAbsolute(relativo)) {
    throw new Error('El run_id produciría una ruta fuera de marketing/generated/_runs/.');
  }

  await writeFile(destino, `${JSON.stringify(validado, null, 2)}\n`, 'utf8');
  return destino;
}
