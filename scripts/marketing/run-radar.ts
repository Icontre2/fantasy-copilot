#!/usr/bin/env node --experimental-strip-types

// Ruta relativa a proposito: se ejecuta directamente con
// `node --experimental-strip-types`, que no resuelve el alias `@/`.
import { ejecutarYGuardarRadar } from '../../src/server/marketing/pipeline/radar.ts';

/**
 * `npm run marketing:radar -- <fecha>` — Etapa 1 de la pipeline.
 *
 * Llama a la API de Claude (con búsqueda web) y escribe
 * `marketing/radar/<fecha>.{json,md}`. Es la ÚNICA etapa que gasta en la API
 * sin que nadie haya seleccionado nada todavía — por eso usa el modelo barato
 * (`MARKETING_AGENT_MODEL_CHEAP`, por defecto Haiku) y nunca más de 20
 * oportunidades. El siguiente paso, `npm run marketing:queue`, decide cuáles
 * de esas 20 merecen pasar a la cadena cara.
 */
async function main(): Promise<void> {
  const fecha = process.argv[2] ?? new Date().toISOString().slice(0, 10);

  const { payload, usage } = await ejecutarYGuardarRadar(fecha);

  console.log(`Fantasy Radar: ${payload.opportunities.length} oportunidad(es) para ${fecha}.`);
  for (const oportunidad of payload.opportunities) {
    console.log(`- ${oportunidad.id} · ${oportunidad.score}/100 · ${oportunidad.title}`);
  }
  console.log(`Tokens: ${usage.inputTokens} entrada / ${usage.outputTokens} salida.`);
  console.log(`Siguiente paso: npm run marketing:queue -- ${fecha}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
