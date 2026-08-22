// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { z } from 'zod';
import { captionsSchema, escenaSchema, planoSchema, qaResultSchema, strategyOutputSchema } from '../schemas.ts';

/**
 * Las cinco etapas caras (`.claude/agents/strategist.md` → `.claude/agents/brand-reviewer.md`),
 * cada una como { schema de su salida, plantilla de su prompt }. `creative.ts`
 * solo encadena estas cinco llamadas — la especificación de QUÉ pide cada
 * etapa vive aquí, no repartida por el orquestador.
 *
 * Cada schema usa exactamente los nombres de campo de `../schemas.ts`: así
 * la salida del modelo encaja en `PaqueteCrudo` sin ninguna traducción
 * intermedia que pueda perder o inventar un campo.
 */

export { strategyOutputSchema };

export const copywriterOutputSchema = z.object({
  hooks: z.array(z.string()).min(1).max(5),
  hook: z.string(),
  script: z.string(),
  captions: captionsSchema,
  cta: z.string(),
  platforms: z.array(z.string()).min(1),
});
export type CopywriterOutput = z.infer<typeof copywriterOutputSchema>;

export const creativeDirectorOutputSchema = z.object({
  shots: z.array(planoSchema).min(1),
  imagePrompt: z.string(),
});
export type CreativeDirectorOutput = z.infer<typeof creativeDirectorOutputSchema>;

export const videoDirectorOutputSchema = z.object({
  videoSequence: z.array(escenaSchema).min(1),
  seedancePrompt: z.string(),
  negativeConstraints: z.array(z.string()),
});
export type VideoDirectorOutput = z.infer<typeof videoDirectorOutputSchema>;

export const brandReviewerOutputSchema = qaResultSchema.omit({ checkedAt: true, checkedBy: true });
export type BrandReviewerOutput = z.infer<typeof brandReviewerOutputSchema>;

/** Contexto de entrada común a las cinco etapas: lo que ya se sabe de la oportunidad. */
export type ContextoDeOportunidad = {
  problem: string;
  feature: string;
  hook: string;
  whyNow: string;
  formats: string[];
  riskNotes?: string;
};

export function promptEstratega(ctx: ContextoDeOportunidad): string {
  return [
    'Oportunidad del Radar:',
    JSON.stringify(ctx, null, 2),
    '',
    'Devuelve JSON con esta forma exacta:',
    '{"audience":"","problem":"","insight":"","feature":"","proofNeeded":"","angle":"","cta":"","riskNotes":""}',
    'Un problema, un insight, una prueba de producto, un CTA. No inventes ninguna función, dato, testimonio ni resultado que no esté ya en la oportunidad de arriba.',
  ].join('\n\n');
}

export function promptCopywriter(estrategia: unknown): string {
  return [
    'Estrategia aprobada:',
    JSON.stringify(estrategia, null, 2),
    '',
    'Devuelve JSON con esta forma exacta:',
    '{"hooks":["","",""],"hook":"","script":"","captions":{"tiktok":"","reels":"","shorts":""},"cta":"","platforms":["tiktok","instagram_reels"]}',
    '3 hooks de menos de 10 palabras cada uno; "hook" es el elegido. El guion sigue problema → tensión → prueba de producto → CTA. En español. Nada de relleno corporativo ni frases que suenen a IA. Cualquier cifra o dato de fútbol tiene que venir de la evidencia de la oportunidad — nunca inventado. "platforms" son las plataformas recomendadas para esta pieza en concreto.',
  ].join('\n\n');
}

export function promptDirectorCreativo(estrategia: unknown, copy: unknown): string {
  return [
    'Estrategia:',
    JSON.stringify(estrategia, null, 2),
    'Copy:',
    JSON.stringify(copy, null, 2),
    '',
    'Devuelve JSON con esta forma exacta:',
    '{"shots":[{"description":"","kind":"real_app_capture","captureNeeded":"nombre exacto de la pantalla de LigaLab, ej. Comparador / Plantilla / Histórico de jugador / Alertas de cláusula / Economía / Mercado"}],"imagePrompt":""}',
    '"kind" es uno de: real_app_capture, generated_visual, typography_motion, football_reference. "captureNeeded" SOLO cuando kind sea real_app_capture — nombra la pantalla real, nunca inventes una interfaz. Vertical 9:16 primero. Prefiere una idea visual fuerte a la complejidad decorativa.',
  ].join('\n\n');
}

export function promptDirectorDeVideo(copy: unknown, creativo: unknown): string {
  return [
    'Copy:',
    JSON.stringify(copy, null, 2),
    'Plan creativo:',
    JSON.stringify(creativo, null, 2),
    '',
    'Devuelve JSON con esta forma exacta:',
    '{"videoSequence":[{"timestamp":"0:00-0:03","description":""}],"seedancePrompt":"","negativeConstraints":[""]}',
    'Secuencia 9:16 con timestamps. No le pidas al modelo de vídeo que genere una interfaz de app legible ni estadísticas precisas falsas — eso son las capturas reales marcadas en el plan creativo. Duración por defecto 8-20 segundos salvo que el concepto necesite más.',
  ].join('\n\n');
}

export function promptRevisorDeMarca(
  ctx: ContextoDeOportunidad,
  estrategia: unknown,
  copy: unknown,
  creativo: unknown,
  video: unknown,
): string {
  return [
    'Oportunidad original (con sus fuentes):',
    JSON.stringify(ctx, null, 2),
    'Estrategia:',
    JSON.stringify(estrategia, null, 2),
    'Copy:',
    JSON.stringify(copy, null, 2),
    'Plan creativo:',
    JSON.stringify(creativo, null, 2),
    'Plan de vídeo:',
    JSON.stringify(video, null, 2),
    '',
    'Comprueba: 1) cada afirmación de producto es real; 2) cada dato de fútbol actual tiene fuente en la oportunidad; 3) sigue BRAND/VOICE/CONTENT_RULES; 4) ninguna captura de pantalla falsa ni métrica inventada; 5) legible en móvil y apropiado para el formato.',
    'Devuelve JSON con esta forma exacta:',
    '{"pass":true,"blockedReasons":[],"warnings":[],"requiredChanges":[]}',
    'Solo un "pass" limpio puede pasar a pending_approval. No publicas nada — solo evalúas.',
  ].join('\n\n');
}
