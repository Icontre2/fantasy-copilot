#!/usr/bin/env node --experimental-strip-types

// Ruta relativa a proposito: se ejecuta directamente con
// `node --experimental-strip-types`, que no resuelve el alias `@/`.
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  idDePieza,
  oportunidadesYaConvertidas,
  piezasDeLaFecha,
  plazasLibres,
  seleccionarOportunidades,
  siguienteNumeroDePieza,
  type Descartada,
} from '../../src/server/marketing/pipeline/queue.ts';
import { radarOpportunitySchema } from '../../src/server/marketing/schemas.ts';

/**
 * `npm run marketing:queue -- <fecha>` — Etapa 1.5.
 *
 * Coge el Radar del día y decide cuáles de sus oportunidades entran en la
 * cadena cara. No llama a Claude ni gasta un token: solo filtra, ordena y
 * escribe `marketing/queue/<fecha>/queue.json` más un `package.json` en
 * borrador por pieza, que es de donde parte `npm run marketing:generate`.
 *
 * La decisión de QUÉ entra vive en `pipeline/queue.ts`, que sí tiene tests.
 * Aquí solo queda la entrada/salida.
 *
 * Ejecutarlo dos veces el mismo día no duplica trabajo ni lo borra: ningún
 * `package.json` de una pieza anterior se pisa, y `queue.json` solo se
 * reescribe cuando de verdad hay piezas nuevas que encolar — pasa entonces a
 * describir esa tanda nueva, que es lo que `marketing:generate` tiene que
 * ejecutar; lo ya generado no vuelve a entrar.
 */

const configSchema = z.object({
  daily: z.object({
    creativeCandidateLimit: z.number().int().positive(),
    minimumScoreForCreative: z.number().int(),
  }),
});
const radarSchema = z.object({ date: z.string(), opportunities: z.array(radarOpportunitySchema) });

const existe = (ruta: string) => access(ruta).then(() => true).catch(() => false);

const EXPLICACION: Record<Descartada['motivo'], string> = {
  ya_convertida: 'ya tiene pieza',
  score_bajo: 'score por debajo del mínimo',
  fuera_del_limite_diario: 'fuera del límite diario',
};

async function main(): Promise<void> {
  const raiz = process.cwd();
  const fecha = process.argv[2] ?? new Date().toISOString().slice(0, 10);

  const config = configSchema.parse(
    JSON.parse(await readFile(path.join(raiz, 'marketing', 'automation.config.json'), 'utf8')),
  );

  const rutaRadar = path.join(raiz, 'marketing', 'radar', `${fecha}.json`);
  if (!(await existe(rutaRadar))) {
    console.error(`No existe el Radar de ${fecha} (${path.relative(raiz, rutaRadar)}).`);
    console.error(`Ejecuta antes: npm run marketing:radar -- ${fecha}`);
    process.exitCode = 1;
    return;
  }
  const radar = radarSchema.parse(JSON.parse(await readFile(rutaRadar, 'utf8')));
  if (radar.date !== fecha) {
    console.error(`El Radar de ${path.relative(raiz, rutaRadar)} dice ser del ${radar.date}, no del ${fecha}.`);
    process.exitCode = 1;
    return;
  }

  // El límite es por DÍA: lo que ya exista para esta fecha descuenta plazas.
  // Sin esto, ejecutar el comando dos veces el mismo día costaría el doble de
  // llamadas a Opus, que es justo lo que `creativeCandidateLimit` evita.
  const yaExisten = await piezasDeLaFecha(raiz, fecha);
  const limite = plazasLibres(config.daily.creativeCandidateLimit, yaExisten.length);

  const { seleccionadas, descartadas } = seleccionarOportunidades({
    oportunidades: radar.opportunities,
    yaConvertidas: await oportunidadesYaConvertidas(raiz),
    minimumScore: config.daily.minimumScoreForCreative,
    limite,
  });

  const carpetaCola = path.join(raiz, 'marketing', 'queue', fecha);
  const rutaCola = path.join(carpetaCola, 'queue.json');

  // Una tanda vacía NO pisa una cola que ya existe: si hoy no hay nada nuevo
  // que añadir es justamente porque las piezas de esta fecha ya se prepararon,
  // y sobrescribir su `queue.json` con `items: []` dejaría a
  // `marketing:generate` sin nada que ejecutar.
  if (limite === 0) {
    console.log(
      `El límite diario (${config.daily.creativeCandidateLimit}) ya está cubierto para ${fecha}: ${yaExisten.length} pieza(s) en marketing/generated/${fecha}/.`,
    );
    if (!(await existe(rutaCola))) console.log('No hay cola que preparar.');
    return;
  }

  if (seleccionadas.length === 0 && (await existe(rutaCola))) {
    console.log(`Nada nuevo para ${fecha}: se conserva la cola que ya existe en ${path.relative(raiz, rutaCola)}.`);
    informarDescartes(descartadas);
    return;
  }

  const primerNumero = siguienteNumeroDePieza(fecha, yaExisten);
  const items = seleccionadas.map((opportunity, index) => ({
    contentId: idDePieza(fecha, primerNumero + index),
    status: 'draft',
    score: opportunity.score,
    opportunity,
    agents: [
      { name: 'strategist', status: 'pending' },
      { name: 'copywriter', status: 'pending' },
      { name: 'creative-director', status: 'pending' },
      { name: 'video-director', status: 'pending' },
      { name: 'brand-reviewer', status: 'pending' },
    ],
    approval: { required: true, status: 'pending', approvedAt: null, approvedBy: null },
  }));

  await mkdir(carpetaCola, { recursive: true });
  await writeFile(
    rutaCola,
    `${JSON.stringify({ date: fecha, generatedAt: new Date().toISOString(), status: items.length ? 'ready' : 'empty', items }, null, 2)}\n`,
  );

  for (const item of items) {
    const carpetaPieza = path.join(raiz, 'marketing', 'generated', fecha, item.contentId);
    const rutaPieza = path.join(carpetaPieza, 'package.json');

    // Un borrador nunca pisa una pieza que ya existe: los ids se derivan de la
    // posición en la tanda, así que un `LL-<fecha>-001` de una ejecución
    // anterior podría colisionar con el de esta y borrar su trabajo.
    if (await existe(rutaPieza)) {
      console.warn(`  Aviso: ${item.contentId} ya existe — no se toca.`);
      continue;
    }

    await mkdir(carpetaPieza, { recursive: true });
    await writeFile(
      rutaPieza,
      `${JSON.stringify(
        {
          id: item.contentId,
          date: fecha,
          status: 'draft',
          sourceOpportunityId: item.opportunity.id,
          score: item.score,
          problem: item.opportunity.problem,
          feature: item.opportunity.feature,
          hook: item.opportunity.hook,
          // `false` y no `true`: quien decide si hace falta una captura real
          // es el Creative Director, derivándolo de sus propios planos
          // (`creative.ts` → `necesitaCaptura`). Un borrador que ya lo afirma
          // está diciendo algo que nadie ha decidido todavía — y encima sin
          // poder decir DE QUÉ pantalla, que es lo que exige el canario de
          // `paquetes-reales.test.ts`.
          needsCapture: false,
          strategy: null,
          script: null,
          imagePrompt: null,
          seedancePrompt: null,
          captions: null,
          qa: null,
          approval: item.approval,
        },
        null,
        2,
      )}\n`,
    );
  }

  console.log(`Cola de agentes de LigaLab: ${items.length} pieza(s) preparada(s) para ${fecha}.`);
  for (const item of items) console.log(`- ${item.contentId} · ${item.score}/100 · ${item.opportunity.title}`);
  informarDescartes(descartadas);
  if (items.length > 0) console.log(`Siguiente paso: npm run marketing:generate -- ${fecha}`);
}

/**
 * Las oportunidades que hoy no entran se dicen en voz alta, con su motivo.
 * Un Radar de 14 ideas que produce 3 piezas deja 11 sin usar, y quien ejecuta
 * esto tiene que ver cuáles y por qué — que caduquen con el día es una
 * decisión (ver `marketing/AGENT_RUNTIME.md`), no un descarte silencioso.
 */
function informarDescartes(descartadas: Descartada[]): void {
  if (descartadas.length === 0) return;
  console.log(`\nFuera de la tanda: ${descartadas.length} oportunidad(es).`);
  for (const d of descartadas) {
    const detalle = d.piezaExistente ? `${EXPLICACION[d.motivo]}: ${d.piezaExistente}` : EXPLICACION[d.motivo];
    console.log(`- ${d.id} · ${d.score}/100 · ${d.title} — ${detalle}`);
  }
  console.log('Las que no entran caducan con el día: el Radar de mañana se genera de cero.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
