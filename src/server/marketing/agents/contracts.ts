// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { z } from 'zod';

/**
 * Los contratos de salida entre agentes (§9 del documento maestro).
 *
 * ── Por qué esto es código y no solo prosa en los .md ───────────────────────
 * «Cada agente debe devolver estructura predecible, no prosa libre». Un .md
 * puede pedirlo; solo un esquema puede comprobarlo. El Orchestrator valida
 * aquí lo que le devuelve cada especialista, y por eso puede distinguir «me
 * ha contestado algo pobre» de «me ha contestado algo que no puedo usar» sin
 * tener que interpretar texto libre.
 *
 * Los campos son exactamente los que fija el documento, en su mismo
 * snake_case: si algún día cambia el documento, este fichero es el que tiene
 * que cambiar con él, y los tests dirán quién se ha quedado atrás.
 */

/** §4 — el Strategist decide si la oportunidad merece producirse. */
export const salidaStrategistSchema = z.object({
  verdict: z.enum(['GO', 'WEAK', 'BLOCKED']),
  audience: z.string().min(1),
  pain: z.string().min(1),
  single_insight: z.string().min(1),
  why_it_matters: z.string().min(1),
  best_angle: z.string().min(1),
  hook_territories: z.array(z.string()).min(1),
  product_relevance: z.string().min(1),
  /** Qué evidencia hace falta. Vacío en evergreen; obligatorio en actualidad. */
  evidence_requirements: z.array(z.string()),
  risks: z.array(z.string()),
  recommended_format: z.enum(['static', 'carousel', 'motion', 'video']),
  confidence: z.number().min(0).max(1),
});

/** §5 — el Copywriter. Cinco hooks y tres CTA, ni más ni menos. */
export const salidaCopywriterSchema = z.object({
  hooks: z.array(z.string().min(1)).length(5),
  best_hook: z.string().min(1),
  spoken_script: z.string().min(1),
  on_screen_text: z.array(z.string()),
  ctas: z.array(z.string().min(1)).length(3),
  best_cta: z.string().min(1),
  tiktok_caption: z.string().min(1),
  alt_caption: z.string().min(1),
  comment_bait: z.string(),
  /** Todo número o hecho que alguien tiene que verificar antes de publicar. */
  claims_needing_validation: z.array(z.string()),
});

/** Los cuatro tipos de plano, ya fijados en `schemas.ts` para los paquetes. */
export const tipoDeAssetSchema = z.enum(['real_app_capture', 'generated_visual', 'typography_motion', 'football_reference']);

/** §6 — el Creative Director. */
export const salidaCreativeDirectorSchema = z
  .object({
    creative_concept: z.string().min(1),
    visual_metaphor: z.string().min(1),
    composition: z.string().min(1),
    scene_system: z.array(z.object({ kind: tipoDeAssetSchema, description: z.string().min(1) })).min(1),
    typography_hierarchy: z.string().min(1),
    brand_devices: z.array(z.string()),
    needs_capture: z.boolean(),
    /** Qué pantalla exacta hace falta. Obligatorio si `needs_capture`. */
    capture_request: z.string().nullable(),
    motion_notes: z.string(),
    cover_frame: z.string().min(1),
    canva_handoff: z.string().nullable(),
  })
  .refine((v) => !v.needs_capture || (v.capture_request !== null && v.capture_request.trim() !== ''), {
    message: 'needs_capture=true exige un capture_request que diga QUÉ pantalla hace falta',
    path: ['capture_request'],
  })
  .refine((v) => v.needs_capture === v.scene_system.some((e) => e.kind === 'real_app_capture'), {
    message: 'needs_capture debe derivarse de los planos: es true si y solo si hay algún real_app_capture',
    path: ['needs_capture'],
  });

/** §7 — el Video Director. Opcional: solo se invoca si la pieza vive en el tiempo. */
export const salidaVideoDirectorSchema = z.object({
  duration_seconds: z.number().int().positive(),
  timeline: z.array(z.object({ from: z.number().min(0), to: z.number().min(0), beat: z.string().min(1) })).min(1),
  motion_notes: z.string(),
  text_timing: z.array(z.string()),
  sfx: z.array(z.string()),
  music_direction: z.string(),
  video_prompt: z.string().min(1),
  editing_notes: z.string(),
  /** Dónde se compone después la captura real, en vez de generarla. */
  product_insertion_point: z.string().nullable(),
});

/** §8 — el Brand Reviewer. El veredicto manda; los issues lo explican. */
export const salidaBrandReviewerSchema = z
  .object({
    verdict: z.enum(['PASS', 'FIX', 'BLOCK']),
    minor_issues: z.array(z.string()),
    major_issues: z.array(z.string()),
    /** Qué hay que cambiar. Obligatorio en FIX: sin esto no se puede autocorregir. */
    required_fixes: z.array(z.string()),
    block_reasons: z.array(z.string()),
  })
  .refine((v) => v.verdict !== 'FIX' || v.required_fixes.length > 0, {
    message: 'FIX sin required_fixes no es corregible',
    path: ['required_fixes'],
  })
  .refine((v) => v.verdict !== 'BLOCK' || v.block_reasons.length > 0, {
    message: 'BLOCK sin block_reasons no deja rastro de por qué',
    path: ['block_reasons'],
  })
  .refine((v) => v.verdict !== 'PASS' || v.major_issues.length === 0, {
    message: 'PASS con major_issues es una contradicción: un problema mayor nunca es un PASS',
    path: ['verdict'],
  });

export type SalidaStrategist = z.infer<typeof salidaStrategistSchema>;
export type SalidaCopywriter = z.infer<typeof salidaCopywriterSchema>;
export type SalidaCreativeDirector = z.infer<typeof salidaCreativeDirectorSchema>;
export type SalidaVideoDirector = z.infer<typeof salidaVideoDirectorSchema>;
export type SalidaBrandReviewer = z.infer<typeof salidaBrandReviewerSchema>;

/** Los cinco especialistas que el Orchestrator puede consultar. */
export const ESPECIALISTAS = ['strategist', 'copywriter', 'creative-director', 'video-director', 'brand-reviewer'] as const;
export type Especialista = (typeof ESPECIALISTAS)[number];

/**
 * Qué pasa si un especialista se cae (§21). Crítico = sin él no hay pieza.
 * El Video Director no lo es: por eso su fallo degrada el formato en vez de
 * tumbar la ejecución.
 */
export const ES_CRITICO: Record<Especialista, boolean> = {
  strategist: true,
  copywriter: true,
  'creative-director': false,
  'video-director': false,
  'brand-reviewer': true,
};

/**
 * Valida la salida de un especialista sin lanzar.
 *
 * El Orchestrator necesita distinguir tres cosas, no dos: válida, inválida
 * (no cumple el contrato) y pobre (cumple el contrato pero no sirve). Las dos
 * últimas se tratan distinto — ver `policy.ts`.
 */
export function validarSalida<T>(schema: z.ZodType<T>, valor: unknown): { ok: true; datos: T } | { ok: false; error: string } {
  const resultado = schema.safeParse(valor);
  if (resultado.success) return { ok: true, datos: resultado.data };
  const primero = resultado.error.issues[0];
  return { ok: false, error: primero ? `${primero.path.join('.') || '(raíz)'}: ${primero.message}` : 'formato inválido' };
}
