// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { radarOpportunitySchema, type RadarOpportunity } from '../schemas.ts';
import { crearLlamadaConBusqueda, type LlamadaClaude, type UsoDeTokens } from './claude.ts';
import { leerDocs } from './docs.ts';
import { pedirJSON } from './json.ts';

/**
 * Etapa 1 — Fantasy Radar (`marketing/prompts/fantasy-radar.md`).
 *
 * La única etapa "barata" de la pipeline y, a la vez, la única con
 * herramienta de búsqueda: todo lo que dice tiene que poder verificarse con
 * una URL real, porque es la base de la que beben las demás. Nunca
 * confía en que el modelo se invente el `id` de cada oportunidad — lo asigna
 * esta función, siempre con la misma forma, para que `sourceOpportunityId`
 * aguas abajo sea estable.
 */

const MODELO_BARATO = process.env.MARKETING_AGENT_MODEL_CHEAP ?? 'claude-haiku-4-5';
const MAX_OPORTUNIDADES = 20;

const radarPayloadSchema = z.object({
  date: z.string(),
  opportunities: z.array(radarOpportunitySchema.omit({ id: true })).min(1).max(MAX_OPORTUNIDADES),
});

export type ResultadoRadar = { payload: { date: string; opportunities: RadarOpportunity[] }; usage: UsoDeTokens };

function idDeOportunidad(fecha: string, indice: number): string {
  return `RD-${fecha.replaceAll('-', '')}-${String(indice + 1).padStart(3, '0')}`;
}

export type OpcionesRadar = {
  /** Dónde viven los documentos estáticos (`marketing/prompts/`, `brand/`, `marketing/*.md`) — casi siempre el propio repo. */
  raizDocs?: string;
  llamar?: LlamadaClaude;
};

export async function generarRadar(fecha: string, opciones: OpcionesRadar = {}): Promise<ResultadoRadar> {
  const raizDocs = opciones.raizDocs ?? process.cwd();
  const llamar = opciones.llamar ?? crearLlamadaConBusqueda(6);
  const contexto = await leerDocs(raizDocs, [
    'brand/BRAND.md',
    'brand/VOICE.md',
    'brand/CONTENT_RULES.md',
    'marketing/PRODUCT_TRUTH.md',
    'marketing/CONTENT_ENGINE.md',
    'marketing/prompts/fantasy-radar.md',
  ]);

  const system = [
    'Eres el agente "Fantasy Radar" de LigaLab. Sigue exactamente la especificación de abajo.',
    contexto,
    'Devuelve JSON con esta forma EXACTA (sin el campo "id", que lo añade el sistema después):',
    '{"date":"YYYY-MM-DD","opportunities":[{"title":"","problem":"","whyNow":"","feature":"","hook":"","formats":[""],"score":0,"sources":[{"label":"","url":"","publishedAt":null}],"riskNotes":""}]}',
    `Entre 10 y ${MAX_OPORTUNIDADES} oportunidades. "score" es un entero 0-100 (urgencia 0-25 + dolor 0-25 + encaje con LigaLab 0-25 + potencial visual 0-15 + calidad de la evidencia 0-10).`,
    'Cada "sources[].url" tiene que ser una URL REAL que hayas encontrado con la búsqueda web — nunca una URL inventada ni de memoria. Si no encuentras una fuente real y verificable para una idea, no la incluyas.',
    '"feature" tiene que ser una función que EXISTE hoy según PRODUCT_TRUTH.md — rechaza cualquier idea que necesite una función no confirmada ahí.',
  ].join('\n\n');

  const prompt = `Genera el radar de oportunidades de contenido de LigaLab para el ${fecha}. Usa la búsqueda web para verificar cualquier dato de actualidad (lesiones, mercado, calendario, jugadores en forma) antes de puntuar una idea — no puntúes nada que no hayas podido verificar.`;

  const { data, usage } = await pedirJSON(llamar, {
    model: MODELO_BARATO,
    system,
    prompt,
    schema: radarPayloadSchema,
    maxTokens: 8000,
  });

  const opportunities: RadarOpportunity[] = data.opportunities
    .slice(0, MAX_OPORTUNIDADES)
    .map((oportunidad, indice) => ({ ...oportunidad, id: idDeOportunidad(fecha, indice) }));

  return { payload: { date: fecha, opportunities }, usage };
}

function markdownDeRadar(payload: { date: string; opportunities: RadarOpportunity[] }): string {
  const lineas = [`# Fantasy Radar — ${payload.date}`, ''];
  for (const oportunidad of payload.opportunities) {
    lineas.push(`## ${oportunidad.id} · ${oportunidad.score}/100 — ${oportunidad.title}`);
    lineas.push('');
    lineas.push(`**Problema:** ${oportunidad.problem}`);
    lineas.push(`**Por qué ahora:** ${oportunidad.whyNow}`);
    lineas.push(`**Feature de LigaLab:** ${oportunidad.feature}`);
    lineas.push(`**Hook:** ${oportunidad.hook}`);
    lineas.push(`**Formatos:** ${oportunidad.formats.join(', ') || '—'}`);
    if (oportunidad.riskNotes) lineas.push(`**Riesgos:** ${oportunidad.riskNotes}`);
    if (oportunidad.sources.length > 0) {
      lineas.push('**Fuentes:**');
      for (const fuente of oportunidad.sources) lineas.push(`- [${fuente.label}](${fuente.url})`);
    }
    lineas.push('');
  }
  return lineas.join('\n');
}

/** Ejecuta el Radar y escribe `marketing/radar/<fecha>.{json,md}`, igual que pide `marketing/prompts/fantasy-radar.md`. */
export async function ejecutarYGuardarRadar(fecha: string, raiz = process.cwd()): Promise<ResultadoRadar> {
  const resultado = await generarRadar(fecha, { raizDocs: raiz });
  const carpeta = path.join(raiz, 'marketing', 'radar');
  await mkdir(carpeta, { recursive: true });
  await writeFile(path.join(carpeta, `${fecha}.json`), `${JSON.stringify(resultado.payload, null, 2)}\n`);
  await writeFile(path.join(carpeta, `${fecha}.md`), `${markdownDeRadar(resultado.payload)}\n`);
  return resultado;
}
