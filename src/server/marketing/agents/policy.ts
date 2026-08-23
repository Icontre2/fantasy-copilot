// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { ES_CRITICO, type Especialista, type SalidaBrandReviewer, type SalidaCopywriter, type SalidaStrategist } from './contracts.ts';

/**
 * Las decisiones del Orchestrator, como funciones puras.
 *
 * ── Por qué existen fuera del .md ───────────────────────────────────────────
 * `.claude/skills/orquestar-pieza/SKILL.md` describe estas reglas en prosa, que
 * es lo que lee Claude al orquestar. Pero «una sola autocorrección», «sin loops» o
 * «el Video Director es opcional» son afirmaciones que o se pueden ejecutar y
 * comprobar, o son buenas intenciones. Aquí están ejecutadas, y
 * `policy.test.ts` recorre los diez escenarios de la Fase C contra ellas.
 *
 * Nada de este fichero llama a un modelo ni escribe en disco: son las
 * decisiones, no la ejecución.
 */

// ── Evergreen vs actualidad (Tests 1, 2 y 3) ─────────────────────────────────

export type TipoDeOportunidad = 'evergreen' | 'actualidad';

export type EntradaDeOportunidad = {
  tipo: TipoDeOportunidad;
  /** La evidencia del Radar. Vacía o ausente = no hay evidencia. */
  evidencias?: Array<{ label: string; url: string; publishedAt: string }>;
};

export type DecisionDeOportunidad =
  | { produce: true; tipo: TipoDeOportunidad; motivo: string }
  | { produce: false; motivo: string; alternativa: 'evergreen' };

/**
 * Decide si una oportunidad puede producirse (§1: «no inventar datos»).
 *
 * Evergreen no necesita Radar: habla de un problema permanente del manager,
 * no de algo que pasó hoy. La actualidad SIN evidencia no se produce —y esa
 * es la única regla asimétrica del sistema: la ausencia de evidencia nunca se
 * convierte en un hecho (§9.8). No se bloquea la ejecución entera: se degrada
 * a evergreen, que siempre está disponible.
 */
export function evaluarOportunidad(entrada: EntradaDeOportunidad): DecisionDeOportunidad {
  if (entrada.tipo === 'evergreen') {
    return { produce: true, tipo: 'evergreen', motivo: 'Una pieza evergreen no depende del Radar.' };
  }
  const evidencias = entrada.evidencias ?? [];
  if (evidencias.length === 0) {
    return {
      produce: false,
      motivo: 'Oportunidad de actualidad sin ninguna fuente verificable: no se produce.',
      alternativa: 'evergreen',
    };
  }
  return { produce: true, tipo: 'actualidad', motivo: `Actualidad con ${evidencias.length} fuente(s) verificable(s).` };
}

// ── El Video Director es opcional (Test 6) ───────────────────────────────────

/**
 * §7: «No debe ejecutarse si la pieza puede resolverse como estática o motion
 * básico». La decisión sale del formato que recomendó el Strategist, no del
 * gusto del Orchestrator — así es reproducible.
 */
export function invocaVideoDirector(formato: SalidaStrategist['recommended_format']): boolean {
  return formato === 'video';
}

// ── PASS / FIX / BLOCK y la autocorrección única (Tests 4 y 5) ───────────────

export type EstadoFinal = 'pending_approval' | 'blocked' | 'review_pending';

export type RutaTrasRevision =
  | { accion: 'finalizar'; estado: EstadoFinal; motivo: string }
  | { accion: 'autocorregir'; cambios: string[] };

/**
 * Qué hace el Orchestrator con un veredicto (§8, §22).
 *
 * `autocorreccionesYaUsadas` es lo que impide el loop, y por eso es un
 * parámetro y no un contador interno: la función no tiene memoria, así que no
 * puede «olvidar» que ya corrigió. Un segundo FIX no vuelve a corregir —
 * termina en `blocked` con el motivo, porque una pieza que sigue mal después
 * de una corrección es un problema real, no un detalle de gusto.
 */
export function rutaTrasRevision(revision: SalidaBrandReviewer, autocorreccionesYaUsadas: number): RutaTrasRevision {
  if (revision.verdict === 'PASS') {
    return { accion: 'finalizar', estado: 'pending_approval', motivo: 'El Brand Reviewer da PASS.' };
  }
  if (revision.verdict === 'BLOCK') {
    return { accion: 'finalizar', estado: 'blocked', motivo: revision.block_reasons.join(' ') };
  }
  if (autocorreccionesYaUsadas >= 1) {
    return {
      accion: 'finalizar',
      estado: 'blocked',
      motivo: `Sigue habiendo problemas tras la autocorrección: ${revision.required_fixes.join(' ')}`,
    };
  }
  return { accion: 'autocorregir', cambios: revision.required_fixes };
}

/**
 * Si el Reviewer falla técnicamente NO se aprueba (§21): queda
 * `review_pending`. Aprobar por defecto convertiría una caída en un permiso.
 */
export function rutaSinRevision(): RutaTrasRevision {
  return { accion: 'finalizar', estado: 'review_pending', motivo: 'El Brand Reviewer no ha devuelto veredicto.' };
}

// ── Output pobre y caída de un especialista (Tests 9 y 10) ───────────────────

export type ResultadoDeEspecialista<T> =
  | { estado: 'ok'; datos: T }
  | { estado: 'invalido'; error: string }
  | { estado: 'caido'; error: string };

export type Recuperacion =
  | { accion: 'reintentar'; especialista: Especialista }
  | { accion: 'degradar'; especialista: Especialista; motivo: string }
  | { accion: 'abortar'; especialista: Especialista; motivo: string };

/**
 * Qué hacer cuando un especialista no devuelve algo utilizable (§21, §22).
 *
 * Un reintento por especialista y por ejecución, nunca dos. Agotado el
 * reintento, manda si el especialista era crítico: sin Strategist o sin
 * Copywriter no hay pieza; sin Creative Director o sin Video Director la hay
 * peor, que es distinto de no haberla.
 */
export function recuperarDe(especialista: Especialista, reintentosYaUsados: number): Recuperacion {
  if (reintentosYaUsados < 1) return { accion: 'reintentar', especialista };
  if (ES_CRITICO[especialista]) {
    return { accion: 'abortar', especialista, motivo: `${especialista} es crítico y no ha devuelto nada utilizable.` };
  }
  return { accion: 'degradar', especialista, motivo: `${especialista} no es crítico: la pieza continúa sin su aportación.` };
}

/**
 * Una salida puede cumplir el contrato y aun así no servir (Test 9): cinco
 * hooks que son la misma frase, un guion de tres palabras. Esto es lo que
 * distingue «pobre» de «inválido» — el esquema no lo puede ver.
 */
export function esCopyPobre(copy: SalidaCopywriter): boolean {
  const hooksDistintos = new Set(copy.hooks.map((h) => h.trim().toLowerCase())).size;
  return hooksDistintos < 3 || copy.spoken_script.trim().split(/\s+/).length < 12;
}

// ── Context packets (§10) ────────────────────────────────────────────────────

export type PaqueteDeContexto = {
  especialista: Especialista;
  /** Rutas del repo que ESTE especialista necesita leer. Nunca el repo entero. */
  documentos: string[];
  /** Lo que el Orchestrator le pasa ya resuelto, para que no lo re-derive. */
  datos: Record<string, unknown>;
};

/**
 * Los documentos mínimos por especialista (§10).
 *
 * Solo se listan ficheros que EXISTEN en el repo. El Strategist recibe además
 * la cola editorial y el Creative Reset vigente: necesita ver IDs/temas ya
 * usados y el feedback humano más reciente ANTES de proponer una dirección.
 * Esto evita duplicados y evita resucitar la línea de copy rechazada.
 *
 * `marketing/PRELAUNCH_CONTENT.md` sigue citado en documentación histórica pero
 * no existe actualmente; no se añade hasta que haya una fuente real que leer.
 * `agents-reales.test.ts` comprueba que cada ruta de aquí existe de verdad.
 */
export const DOCUMENTOS_POR_ESPECIALISTA: Record<Especialista, string[]> = {
  strategist: [
    'marketing/PRODUCT_TRUTH.md',
    'marketing/STRATEGY.md',
    'marketing/editorial-queue.json',
    'marketing/creative-reset-2026-08-22.md',
  ],
  copywriter: ['brand/VOICE.md', 'brand/CONTENT_RULES.md'],
  'creative-director': ['brand/BRAND.md', 'marketing/IMAGE_PIPELINE.md', 'marketing/CREATIVE_FACTORY.md'],
  'video-director': ['marketing/SEEDANCE_PIPELINE.md'],
  'brand-reviewer': ['brand/BRAND.md', 'brand/VOICE.md', 'brand/CONTENT_RULES.md', 'marketing/PRODUCT_TRUTH.md'],
};

/**
 * Arma el paquete de contexto de un especialista.
 *
 * El objetivo es el del §10: que nadie lea el repo entero. Por eso `datos`
 * lleva lo ya decidido y no el contexto crudo — el Copywriter recibe el
 * insight aprobado, no la deliberación que llevó a él.
 */
export function paqueteDeContexto(especialista: Especialista, datos: Record<string, unknown>): PaqueteDeContexto {
  return { especialista, documentos: DOCUMENTOS_POR_ESPECIALISTA[especialista], datos };
}

// ── Registro de ejecución (§24) ──────────────────────────────────────────────

export type RegistroDeEjecucion = {
  run_id: string;
  timestamp: string;
  opportunity_id: string | null;
  agentes_invocados: Especialista[];
  reintentos: number;
  reviewer_verdict: SalidaBrandReviewer['verdict'] | null;
  autocorrection_used: boolean;
  final_status: EstadoFinal;
  content_id: string | null;
};
