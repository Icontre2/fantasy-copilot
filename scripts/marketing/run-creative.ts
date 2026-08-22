#!/usr/bin/env node --experimental-strip-types

// Ruta relativa a proposito: se ejecuta directamente con
// `node --experimental-strip-types`, que no resuelve el alias `@/`.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { guardarRegistroDeEjecucion } from '../../src/server/marketing/agents/execution-log.ts';
import { generarYGuardarCreativo } from '../../src/server/marketing/pipeline/creative.ts';

/**
 * `npm run marketing:generate -- <fecha> [contentId]` — Etapas 2-6.
 *
 * Da por hecho que YA existe `marketing/queue/<fecha>/queue.json` (lo crea
 * `npm run marketing:queue`, que ya decidió cuáles de las oportunidades del
 * Radar merecen la cadena cara). Este script no vuelve a seleccionar ni a
 * puntuar nada — solo ejecuta Strategist → Copywriter → Creative Director →
 * Video Director → Brand Reviewer sobre cada pieza ya seleccionada.
 *
 * El límite de `automation.config.json` se vuelve a comprobar aquí, aunque
 * `prepare-agent-queue.ts` ya lo aplicó: defensa en profundidad — si algún
 * día alguien edita `queue.json` a mano y le añade piezas de más, esto no las
 * ejecuta todas igualmente.
 */

const configSchema = z.object({ daily: z.object({ creativeCandidateLimit: z.number().int().positive() }) });
const queueSchema = z.object({ items: z.array(z.object({ contentId: z.string() })) });
const AGENTES = ['strategist', 'copywriter', 'creative-director', 'video-director', 'brand-reviewer'] as const;

async function main(): Promise<void> {
  const raiz = process.cwd();
  const fecha = process.argv[2];
  const soloId = process.argv[3];

  if (!fecha) {
    console.error('Uso: npm run marketing:generate -- <fecha> [contentId]');
    process.exitCode = 1;
    return;
  }

  const config = configSchema.parse(JSON.parse(await readFile(path.join(raiz, 'marketing', 'automation.config.json'), 'utf8')));
  const queuePath = path.join(raiz, 'marketing', 'queue', fecha, 'queue.json');

  let queueTexto: string;
  try {
    queueTexto = await readFile(queuePath, 'utf8');
  } catch {
    console.error(`No existe la cola de ${fecha} (${path.relative(raiz, queuePath)}).`);
    console.error(`Prepárala antes: npm run marketing:queue -- ${fecha}`);
    process.exitCode = 1;
    return;
  }
  const queue = queueSchema.parse(JSON.parse(queueTexto));

  let items = queue.items;
  if (soloId) items = items.filter((item) => item.contentId === soloId);

  const limite = config.daily.creativeCandidateLimit;
  if (items.length > limite) {
    console.warn(`Aviso: queue.json trae ${items.length} pieza(s), más que el límite configurado (${limite}). Se procesan solo las ${limite} primeras.`);
    items = items.slice(0, limite);
  }
  if (items.length === 0) {
    console.log('Nada que generar.');
    return;
  }

  let totalEntrada = 0;
  let totalSalida = 0;
  for (const item of items) {
    const runId = `sdk-${fecha}-${item.contentId}-${randomUUID()}`;
    console.log(`→ ${item.contentId}…`);
    try {
      const { paquete, usage } = await generarYGuardarCreativo(fecha, item.contentId, raiz);
      totalEntrada += usage.inputTokens;
      totalSalida += usage.outputTokens;

      const verdict = paquete.qa?.pass
        ? 'PASS'
        : paquete.qa?.blockedReasons?.length
          ? 'BLOCK'
          : 'FIX';
      const finalStatus = paquete.qa?.pass
        ? 'pending_approval'
        : paquete.qa?.blockedReasons?.length
          ? 'blocked'
          : 'review_pending';

      await guardarRegistroDeEjecucion(
        {
          run_id: runId,
          timestamp: new Date().toISOString(),
          opportunity_id: paquete.sourceOpportunityId ?? null,
          // En una ejecución exitosa esta pipeline, a día de hoy, invoca las
          // cinco etapas. El runner todavía NO usa la lógica opcional de la
          // skill del Orchestrator; por eso se registra exactamente lo que
          // hizo el código actual y no lo que debería hacer una fase futura.
          agentes_invocados: [...AGENTES],
          // `pedirJSON` puede reintentar internamente y todavía no expone ese
          // contador. No escribimos 0 porque sería inventarlo.
          reintentos: null,
          reviewer_verdict: verdict,
          // La pipeline SDK no implementa la autocorrección semántica del
          // Orchestrator. null = no observable en esta ruta, no "false".
          autocorrection_used: null,
          final_status: finalStatus,
          content_id: paquete.id,
          source: 'sdk-pipeline',
          trace_complete: false,
          error: null,
        },
        raiz,
      );

      console.log(`  ${paquete.status} · QA ${paquete.qa?.pass ? 'PASA' : 'NO PASA'} · ${usage.inputTokens}/${usage.outputTokens} tokens`);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      console.error(`  ERROR en ${item.contentId}: ${mensaje}`);
      await guardarRegistroDeEjecucion(
        {
          run_id: runId,
          timestamp: new Date().toISOString(),
          opportunity_id: null,
          agentes_invocados: null,
          reintentos: null,
          reviewer_verdict: null,
          autocorrection_used: null,
          final_status: 'review_pending',
          content_id: item.contentId,
          source: 'sdk-pipeline',
          trace_complete: false,
          error: mensaje,
        },
        raiz,
      );
    }
  }
  console.log(`Total: ${totalEntrada} tokens de entrada, ${totalSalida} de salida.`);
  console.log('Ninguna pieza se publica sola: ábrela en /marketing para revisarla.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
