// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { paqueteCrudoSchema, radarOpportunitySchema, type PaqueteCrudo } from '../schemas.ts';
import { leerPaquete } from '../packages.ts';
import { llamarClaude, type LlamadaClaude, type UsoDeTokens } from './claude.ts';
import { leerDocs } from './docs.ts';
import { pedirJSON } from './json.ts';
import {
  brandReviewerOutputSchema,
  copywriterOutputSchema,
  creativeDirectorOutputSchema,
  promptCopywriter,
  promptDirectorCreativo,
  promptDirectorDeVideo,
  promptEstratega,
  promptRevisorDeMarca,
  strategyOutputSchema,
  videoDirectorOutputSchema,
  type ContextoDeOportunidad,
} from './stages.ts';

/**
 * Etapas 2-6 — Strategist → Copywriter → Creative Director → Video Director
 * → Brand Reviewer (`agents/strategist.md` … `agents/brand-reviewer.md`).
 *
 * Parte de un `package.json` que YA existe (el `draft` que escribe
 * `prepare-agent-queue.mjs`) y del `marketing/radar/<fecha>.json` del que
 * salió — nunca reconstruye la selección ni el scoring, que es trabajo del
 * Radar y de ese script. Solo rellena lo que un `package.json` recién creado
 * tiene a `null`.
 */

const MODELO_CARO = process.env.MARKETING_AGENT_MODEL ?? 'claude-opus-5';

const radarArchivoSchema = z.object({ date: z.string(), opportunities: z.array(radarOpportunitySchema) });

async function leerOportunidad(raiz: string, fecha: string, sourceOpportunityId: string) {
  const ruta = path.join(raiz, 'marketing', 'radar', `${fecha}.json`);
  const texto = await readFile(ruta, 'utf8');
  const radar = radarArchivoSchema.parse(JSON.parse(texto));
  const oportunidad = radar.opportunities.find((o) => o.id === sourceOpportunityId);
  if (!oportunidad) throw new Error(`No se encuentra la oportunidad ${sourceOpportunityId} en ${ruta}.`);
  return oportunidad;
}

export type ResultadoCreativo = { paquete: PaqueteCrudo; usage: UsoDeTokens };

export type OpcionesCreativo = {
  /** Dónde vive el `package.json` y el `radar/<fecha>.json` de esta tanda — casi siempre el propio repo, un directorio temporal en los tests. */
  raizDatos?: string;
  /** Dónde viven los documentos estáticos (`agents/`, `brand/`, `marketing/*.md`) — casi siempre el propio repo. Separado de `raizDatos` a propósito: un test puede fabricar datos en un directorio temporal sin tener que copiar ahí también toda la documentación real. */
  raizDocs?: string;
  llamar?: LlamadaClaude;
};

/** Ejecuta las cinco etapas caras sobre UN `contentId` y devuelve el paquete completo, ya validado. */
export async function generarCreativo(fecha: string, contentId: string, opciones: OpcionesCreativo = {}): Promise<ResultadoCreativo> {
  const raizDatos = opciones.raizDatos ?? process.cwd();
  const raizDocs = opciones.raizDocs ?? process.cwd();
  const llamar = opciones.llamar ?? llamarClaude;

  const rutaPaquete = path.join(raizDatos, 'marketing', 'generated', fecha, contentId, 'package.json');
  const leido = await leerPaquete(fecha, contentId, rutaPaquete);
  if (leido.blocked) throw new Error(`«${contentId}» no se puede leer: ${leido.error}`);
  const base = leido.crudo;

  const oportunidad = await leerOportunidad(raizDatos, fecha, base.sourceOpportunityId);
  const ctx: ContextoDeOportunidad = {
    problem: base.problem,
    feature: base.feature,
    hook: base.hook,
    whyNow: oportunidad.whyNow,
    formats: oportunidad.formats,
    riskNotes: oportunidad.riskNotes,
  };

  const total: UsoDeTokens = { inputTokens: 0, outputTokens: 0 };
  const sumar = (u: UsoDeTokens) => {
    total.inputTokens += u.inputTokens;
    total.outputTokens += u.outputTokens;
  };

  // 1. Strategist
  const docsEstratega = await leerDocs(raizDocs, ['marketing/PRODUCT_TRUTH.md', 'marketing/STRATEGY.md', 'marketing/CONTENT_ENGINE.md', 'agents/strategist.md']);
  const estrategia = await pedirJSON(llamar, {
    model: MODELO_CARO,
    system: `Eres el agente "Strategist" de LigaLab.\n\n${docsEstratega}`,
    prompt: promptEstratega(ctx),
    schema: strategyOutputSchema,
  });
  sumar(estrategia.usage);

  // 2. Copywriter
  const docsCopy = await leerDocs(raizDocs, ['brand/VOICE.md', 'brand/CONTENT_RULES.md', 'agents/copywriter.md']);
  const copy = await pedirJSON(llamar, {
    model: MODELO_CARO,
    system: `Eres el agente "Copywriter" de LigaLab.\n\n${docsCopy}`,
    prompt: promptCopywriter(estrategia.data),
    schema: copywriterOutputSchema,
  });
  sumar(copy.usage);

  // 3. Creative Director
  const docsCreativo = await leerDocs(raizDocs, ['brand/BRAND.md', 'marketing/IMAGE_PIPELINE.md', 'agents/creative-director.md']);
  const creativo = await pedirJSON(llamar, {
    model: MODELO_CARO,
    system: `Eres el agente "Creative Director" de LigaLab.\n\n${docsCreativo}`,
    prompt: promptDirectorCreativo(estrategia.data, copy.data),
    schema: creativeDirectorOutputSchema,
  });
  sumar(creativo.usage);

  // 4. Video Director
  const docsVideo = await leerDocs(raizDocs, ['marketing/SEEDANCE_PIPELINE.md', 'agents/video-director.md']);
  const video = await pedirJSON(llamar, {
    model: MODELO_CARO,
    system: `Eres el agente "Video Director" de LigaLab.\n\n${docsVideo}`,
    prompt: promptDirectorDeVideo(copy.data, creativo.data),
    schema: videoDirectorOutputSchema,
  });
  sumar(video.usage);

  // 5. Brand Reviewer — el gate. Nunca publica; solo decide pass/fail.
  const docsRevisor = await leerDocs(raizDocs, ['marketing/PRODUCT_TRUTH.md', 'brand/BRAND.md', 'brand/VOICE.md', 'brand/CONTENT_RULES.md', 'agents/brand-reviewer.md']);
  const revision = await pedirJSON(llamar, {
    model: MODELO_CARO,
    system: `Eres el agente "Brand Reviewer" de LigaLab.\n\n${docsRevisor}`,
    prompt: promptRevisorDeMarca(ctx, estrategia.data, copy.data, creativo.data, video.data),
    schema: brandReviewerOutputSchema,
  });
  sumar(revision.usage);

  const ahora = new Date().toISOString();
  const necesitaCaptura = creativo.data.shots.some((plano) => plano.kind === 'real_app_capture');

  const paqueteSinValidar = {
    ...base,
    hook: copy.data.hook,
    hooks: copy.data.hooks,
    needsCapture: necesitaCaptura,
    strategy: estrategia.data,
    script: copy.data.script,
    captions: copy.data.captions,
    cta: copy.data.cta,
    platforms: copy.data.platforms,
    shots: creativo.data.shots,
    imagePrompt: creativo.data.imagePrompt,
    videoSequence: video.data.videoSequence,
    seedancePrompt: video.data.seedancePrompt,
    negativeConstraints: video.data.negativeConstraints,
    // Las fuentes y los formatos vienen del Radar, ya verificados — ninguna
    // etapa cara los reescribe ni los reinventa.
    sources: oportunidad.sources,
    formats: oportunidad.formats,
    qa: { ...revision.data, checkedAt: ahora, checkedBy: 'brand-reviewer-agent' },
    status: revision.data.pass ? ('pending_approval' as const) : ('brand_review' as const),
  };

  const paquete = paqueteCrudoSchema.parse(paqueteSinValidar);
  return { paquete, usage: total };
}

function seccion(titulo: string, cuerpo: string): string {
  return `## ${titulo}\n\n${cuerpo}\n`;
}

function brief(paquete: PaqueteCrudo): string {
  const partes = [`# ${paquete.id} — ${paquete.hook}`, ''];
  partes.push(seccion('Problema', paquete.problem));
  partes.push(seccion('Feature de LigaLab', paquete.feature));
  if (paquete.strategy?.insight) partes.push(seccion('Insight', paquete.strategy.insight));
  if (paquete.hooks?.length) partes.push(seccion('Hooks', paquete.hooks.map((h) => `- ${h}`).join('\n')));
  partes.push(seccion('Score del Radar', String(paquete.score)));
  if (paquete.sources?.length) {
    partes.push(seccion('Fuentes', paquete.sources.map((f) => `- [${f.label}](${f.url})`).join('\n')));
  }
  return partes.join('\n');
}

/** Los ficheros humanos que acompañan a `package.json` (`brief.md`, `script.md`, …). Ninguno es la fuente de verdad — solo trazabilidad. */
export async function escribirFicherosCompaneros(carpeta: string, paquete: PaqueteCrudo): Promise<void> {
  await writeFile(path.join(carpeta, 'brief.md'), brief(paquete));
  if (paquete.script) await writeFile(path.join(carpeta, 'script.md'), `${paquete.script}\n`);
  if (paquete.seedancePrompt) {
    const secuencia = (paquete.videoSequence ?? []).map((e) => `- **${e.timestamp}** ${e.description}`).join('\n');
    await writeFile(
      path.join(carpeta, 'seedance-prompt.md'),
      `${paquete.seedancePrompt}\n\n## Secuencia\n\n${secuencia}\n\n## Restricciones negativas\n\n${(paquete.negativeConstraints ?? []).map((r) => `- ${r}`).join('\n')}\n`,
    );
  }
  if (paquete.imagePrompt) {
    const planos = (paquete.shots ?? []).map((p) => `- [${p.kind}] ${p.description}${p.captureNeeded ? ` — captura real: ${p.captureNeeded}` : ''}`).join('\n');
    await writeFile(path.join(carpeta, 'image-prompt.md'), `${paquete.imagePrompt}\n\n## Planos\n\n${planos}\n`);
  }
  if (paquete.captions) {
    const lineas = Object.entries(paquete.captions)
      .filter(([, v]) => v)
      .map(([red, texto]) => `## ${red}\n\n${texto}`);
    await writeFile(path.join(carpeta, 'captions.md'), `${lineas.join('\n\n')}\n`);
  }
  if (paquete.qa) {
    const qa = paquete.qa;
    await writeFile(
      path.join(carpeta, 'qa.md'),
      [
        `# QA — ${paquete.id}`,
        '',
        `**Resultado:** ${qa.pass ? 'PASA' : 'NO PASA'}`,
        qa.blockedReasons.length ? seccion('Motivos de bloqueo', qa.blockedReasons.map((r) => `- ${r}`).join('\n')) : '',
        qa.requiredChanges.length ? seccion('Cambios necesarios', qa.requiredChanges.map((r) => `- ${r}`).join('\n')) : '',
        qa.warnings.length ? seccion('Avisos', qa.warnings.map((r) => `- ${r}`).join('\n')) : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
}

/** Ejecuta la cadena y escribe `package.json` + los ficheros compañeros. */
export async function generarYGuardarCreativo(fecha: string, contentId: string, raiz = process.cwd()): Promise<ResultadoCreativo> {
  const resultado = await generarCreativo(fecha, contentId, { raizDatos: raiz, raizDocs: raiz });
  const carpeta = path.join(raiz, 'marketing', 'generated', fecha, contentId);
  await writeFile(path.join(carpeta, 'package.json'), `${JSON.stringify(resultado.paquete, null, 2)}\n`);
  await escribirFicherosCompaneros(carpeta, resultado.paquete);
  return resultado;
}
