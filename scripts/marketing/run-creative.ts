#!/usr/bin/env node --experimental-strip-types

// Ruta relativa a proposito: se ejecuta directamente con
// `node --experimental-strip-types`, que no resuelve el alias `@/`.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { generarYGuardarCreativo } from '../../src/server/marketing/pipeline/creative.ts';
import { anotarTanda, etapaMasLenta, nuevoRunId, resumirTanda, type RegistroDeTanda } from '../../src/server/marketing/agents/registro.ts';

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

  // Sin `queue.json` esto reventaba con un ENOENT pelado, que no dice cuál de
  // las dos cosas falta: la cola de ese día, o el Radar del que sale. Es el
  // fallo que se encuentra al ejecutar la pipeline por primera vez sobre una
  // fecha cuyo Radar ya existe pero cuya cola nunca se preparó.
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
    console.log(`→ ${item.contentId}…`);

    /*
     * El registro se escribe TAMBIÉN cuando la tanda falla, y sobre todo
     * entonces: una ejecución que revienta es justo la que hay que poder
     * diagnosticar después, y hasta ahora lo único que dejaba era una línea en
     * la consola de quien la lanzó. Ver §24 del documento maestro.
     */
    const desde = Date.now();
    const base = { run_id: nuevoRunId(), timestamp: new Date().toISOString(), motor: 'pipeline' as const, content_id: item.contentId };

    try {
      const { paquete, usage, etapas } = await generarYGuardarCreativo(fecha, item.contentId, raiz);
      totalEntrada += usage.inputTokens;
      totalSalida += usage.outputTokens;

      const registro: RegistroDeTanda = {
        ...base,
        opportunity_id: paquete.sourceOpportunityId ?? null,
        etapas,
        ms_total: Date.now() - desde,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        // La pipeline no emite PASS/FIX/BLOCK ni autocorrige: `null` dice que
        // este motor no tiene ese concepto, en vez de fingir que no pasó.
        reviewer_verdict: null,
        autocorrection_used: null,
        qa_pass: paquete.qa?.pass ?? null,
        final_status: paquete.status,
        error: null,
      };
      await anotarTanda(raiz, fecha, registro);

      const lenta = etapaMasLenta(registro);
      console.log(`  ${paquete.status} · QA ${paquete.qa?.pass ? 'PASA' : 'NO PASA'} · ${usage.inputTokens}/${usage.outputTokens} tokens${lenta ? ` · más lenta: ${lenta.agente}` : ''}`);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      await anotarTanda(raiz, fecha, {
        ...base,
        opportunity_id: null,
        etapas: [],
        ms_total: Date.now() - desde,
        input_tokens: 0,
        output_tokens: 0,
        reviewer_verdict: null,
        autocorrection_used: null,
        qa_pass: null,
        final_status: 'error',
        error: mensaje,
      });
      console.error(`  ERROR en ${item.contentId}: ${mensaje}`);
    }
  }
  console.log(`Total: ${totalEntrada} tokens de entrada, ${totalSalida} de salida.`);
  console.log(`Registro de la tanda: marketing/runs/${fecha}.jsonl`);
  console.log('Ninguna pieza se publica sola: ábrela en /marketing para revisarla.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
