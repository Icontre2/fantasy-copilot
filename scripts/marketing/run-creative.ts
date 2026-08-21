#!/usr/bin/env node --experimental-strip-types

// Ruta relativa a proposito: se ejecuta directamente con
// `node --experimental-strip-types`, que no resuelve el alias `@/`.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
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
 * `prepare-agent-queue.mjs` ya lo aplicó: defensa en profundidad — si algún
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
  const queue = queueSchema.parse(JSON.parse(await readFile(queuePath, 'utf8')));

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
    try {
      const { paquete, usage } = await generarYGuardarCreativo(fecha, item.contentId, raiz);
      totalEntrada += usage.inputTokens;
      totalSalida += usage.outputTokens;
      console.log(`  ${paquete.status} · QA ${paquete.qa?.pass ? 'PASA' : 'NO PASA'} · ${usage.inputTokens}/${usage.outputTokens} tokens`);
    } catch (error) {
      console.error(`  ERROR en ${item.contentId}: ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`Total: ${totalEntrada} tokens de entrada, ${totalSalida} de salida.`);
  console.log('Ninguna pieza se publica sola: ábrela en /marketing para revisarla.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
