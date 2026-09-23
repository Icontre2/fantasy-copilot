import { z } from 'zod';

/**
 * Los contratos de la Creative Factory, en un solo sitio.
 *
 * ── Por qué hace falta esto ──────────────────────────────────────────────────
 * El repo tiene DOS convenciones de "paquete de contenido" que no se hablan
 * entre sí. La primera (`marketing/templates/content-package.schema.json`,
 * `brand/CONTENT_RULES.md`) usa snake_case y un id `LL-YYYY-NNN`; nunca llegó a
 * tener código que la escribiera. La segunda —la que SÍ escribe
 * `scripts/marketing/prepare-agent-queue.ts` y lee `set-approval.mjs`— usa
 * camelCase y un id `LL-YYYYMMDD-NNN`. Son incompatibles y nadie las reconcilió.
 *
 * Aquí se toma la SEGUNDA como fuente de verdad, porque es la única con código
 * de verdad detrás. `normalizarPaqueteCrudo` acepta ademas los alias mas obvios
 * de la primera (por si alguien la sigue a mano) sin intentar dar soporte
 * completo a una convención que nunca se ejecutó.
 *
 * Todo lo que pueda faltar en un paquete real —porque las fases de estrategia,
 * copy, dirección creativa y vídeo son hoy solo prompts en `.claude/agents/*.md`, sin
 * agente que las ejecute— es opcional aquí a propósito. Un campo vacío se
 * enseña vacío en el panel; no se rellena con nada inventado.
 */

// ── Radar ────────────────────────────────────────────────────────────────────
// Espeja `marketing/radar.schema.json` en Zod, para poder validar sin duplicar
// la definición JSON Schema como una segunda fuente de verdad manual.

export const fuenteSchema = z.object({
  label: z.string(),
  url: z.string(),
  publishedAt: z.string().nullable().optional(),
});

export const radarOpportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  problem: z.string(),
  whyNow: z.string(),
  feature: z.string(),
  hook: z.string(),
  formats: z.array(z.string()),
  score: z.number().int().min(0).max(100),
  sources: z.array(fuenteSchema),
  riskNotes: z.string().optional(),
});
export type RadarOpportunity = z.infer<typeof radarOpportunitySchema>;

// ── Estrategia (.claude/agents/strategist.md) ───────────────────────────────────────

export const strategyOutputSchema = z.object({
  audience: z.string().optional(),
  problem: z.string().optional(),
  insight: z.string().optional(),
  feature: z.string().optional(),
  proofNeeded: z.string().optional(),
  angle: z.string().optional(),
  cta: z.string().optional(),
  riskNotes: z.string().optional(),
});

// ── Copy (.claude/agents/copywriter.md) ─────────────────────────────────────────────

export const captionsSchema = z.object({
  tiktok: z.string().optional(),
  reels: z.string().optional(),
  shorts: z.string().optional(),
  carousel: z.string().optional(),
});

// ── Dirección creativa (.claude/agents/creative-director.md) ────────────────────────

export const TIPOS_DE_PLANO = ['real_app_capture', 'generated_visual', 'typography_motion', 'football_reference'] as const;
export const tipoDePlanoSchema = z.enum(TIPOS_DE_PLANO);

export const planoSchema = z.object({
  description: z.string(),
  kind: tipoDePlanoSchema,
  /** Solo cuando `kind` es `real_app_capture`: qué pantalla exacta hace falta. */
  captureNeeded: z.string().optional(),
});

// ── Vídeo (.claude/agents/video-director.md) ────────────────────────────────────────

export const escenaSchema = z.object({
  timestamp: z.string(),
  description: z.string(),
});

// ── QA (.claude/agents/brand-reviewer.md) ───────────────────────────────────────────
//
// El campo que de verdad manda es `pass`: es el único que lee
// `scripts/marketing/set-approval.mjs` para decidir si se puede aprobar. Los
// demás son la explicación de por qué.

export const qaResultSchema = z.object({
  pass: z.boolean(),
  blockedReasons: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  requiredChanges: z.array(z.string()).default([]),
  checkedAt: z.string().optional(),
  /** Quién lo comprobó. Hoy es siempre una persona: no hay agente ejecutándose. */
  checkedBy: z.string().optional(),
});
export type QAResult = z.infer<typeof qaResultSchema>;

// ── Estados ──────────────────────────────────────────────────────────────────
//
// Los mismos que `marketing/automation.config.json` en su campo `states`, más
// `blocked` —que no es un estado de la Creative Factory, es lo que este panel
// le pone a un paquete que no se puede ni leer— porque ese fichero no lo
// incluye y aquí hace falta poder decirlo.

export const ESTADOS = [
  'draft',
  /*
   * La pieza está escrita y espera producción creativa. No es `pending_approval`
   * —nadie ha pedido aún que se apruebe— ni `generated`. Lo usan las piezas de
   * la serie 100; mapearlo a un estado existente habría cambiado su significado
   * y, peor, habría ofrecido «aprobar» algo que nadie ha mandado a aprobar.
   */
  'ready_for_design',
  'brand_review',
  'fact_review',
  'pending_approval',
  'approved',
  'rejected',
  'blocked',
  'generated',
  'published',
] as const;
export const estadoSchema = z.enum(ESTADOS);
export type Estado = z.infer<typeof estadoSchema>;

/** Estados en los que todavía tiene sentido editar el contenido creativo. */
export const ESTADOS_EDITABLES: readonly Estado[] = ['draft', 'brand_review', 'fact_review', 'pending_approval'];

// ── Auditoría (fase 8) ───────────────────────────────────────────────────────

export const ACCIONES_DE_AUDITORIA = [
  'created',
  'qa_passed',
  'qa_failed',
  'edited',
  'approved',
  'rejected',
  'reopened',
  /*
   * Adjuntar una captura real es una acción humana más, y la regla es que
   * TODA acción humana queda registrada. No estaba en la lista original
   * porque entonces no se podía adjuntar nada; ahora que se puede, dejarla
   * fuera sería un hueco en el historial, no una fidelidad a la lista.
   */
  'capture_added',
] as const;
export const accionDeAuditoriaSchema = z.enum(ACCIONES_DE_AUDITORIA);

export const entradaDeAuditoriaSchema = z.object({
  action: accionDeAuditoriaSchema,
  actor: z.string(),
  timestamp: z.string(),
  note: z.string().optional(),
});
export type EntradaDeAuditoria = z.infer<typeof entradaDeAuditoriaSchema>;

// ── Capturas reales (fase 5) ─────────────────────────────────────────────────
//
// Solo la estructura: no hay almacenamiento externo conectado en este sprint,
// así que `file` de momento es una URL o ruta que alguien pega a mano.

export const capturaRealSchema = z.object({
  type: z.string(),
  file: z.string(),
  description: z.string().optional(),
  addedAt: z.string(),
});
export type CapturaReal = z.infer<typeof capturaRealSchema>;

// ── El paquete crudo, tal cual puede venir del fichero ──────────────────────
//
// Deliberadamente permisivo: casi todo opcional, porque casi todo lo llenan
// fases que todavía no tienen agente. Lo único obligatorio es lo que
// `prepare-agent-queue.ts` YA escribe siempre.

export const paqueteCrudoSchema = z
  .object({
    /*
     * Las DOS convenciones de id conviven de verdad, no en teoría:
     * `prepare-agent-queue.ts` escribe `LL-YYYYMMDD-NNN`, y los paquetes que
     * se han producido siguiendo `marketing/templates/content-package.schema.json`
     * usan `LL-YYYY-NNN`. Exigir solo la primera dejaba la pieza real
     * `LL-2026-001` marcada como «bloqueada» en el panel, que es justo lo que
     * este campo NO debe provocar.
     */
    id: z.string().regex(/^LL-\d{4}(?:\d{4})?-\d{3}$/, 'el id no tiene la forma LL-YYYYMMDD-NNN ni LL-YYYY-NNN'),
    date: z.string(),
    status: estadoSchema,
    sourceOpportunityId: z.string(),
    score: z.number().int().min(0).max(100),
    problem: z.string(),
    feature: z.string(),
    hook: z.string(),
    needsCapture: z.boolean(),

    // Lo que llenarían las fases todavía no automatizadas.
    strategy: strategyOutputSchema.nullable().optional(),
    hooks: z.array(z.string()).optional(),
    script: z.string().nullable().optional(),
    captions: captionsSchema.nullable().optional(),
    shots: z.array(planoSchema).optional(),
    imagePrompt: z.string().nullable().optional(),
    seedancePrompt: z.string().nullable().optional(),
    videoSequence: z.array(escenaSchema).optional(),
    negativeConstraints: z.array(z.string()).optional(),
    platforms: z.array(z.string()).optional(),
    formats: z.array(z.string()).optional(),
    sources: z.array(fuenteSchema).optional(),
    cta: z.string().nullable().optional(),

    /**
     * Qué pantalla real hace falta, en una frase. Es el `capture_request` de
     * la convención antigua — y ahí es el ÚNICO sitio donde vive esa
     * información, así que perderlo dejaría la fase 5 sin nada que enseñar
     * («captura necesaria: sí» sin decir de qué).
     */
    captureRequest: z.string().nullable().optional(),

    /** Capturas reales ya adjuntas en el propio fichero (`assets.realCaptures`). */
    captures: z.array(capturaRealSchema).optional(),

    // El QA que escribe el fichero antes de que exista estado humano en la
    // base. Una vez hay estado humano, ESE manda (ver `mergePaquete`).
    qa: qaResultSchema.nullable().optional(),

    approval: z
      .object({
        required: z.boolean().optional(),
        status: z.string().optional(),
        approvedAt: z.string().nullable().optional(),
        approvedBy: z.string().nullable().optional(),
        decidedAt: z.string().nullable().optional(),
        decidedBy: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  /*
   * `passthrough` porque los ficheros de la convención antigua traen campos
   * que aquí no tienen equivalente (`product_truth`, `radarId`, `assets`…).
   * `normalizarPaquete` (en `packages.ts`) los TRADUCE a los de arriba antes
   * de validar; esto solo evita que los originales, ya traducidos, hagan
   * fallar la validación por sobrar.
   */
  .passthrough();

export type PaqueteCrudo = z.infer<typeof paqueteCrudoSchema>;
