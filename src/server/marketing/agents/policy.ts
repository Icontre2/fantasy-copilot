// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { ES_CRITICO, type Especialista, type SalidaBrandReviewer, type SalidaCopywriter, type SalidaStrategist } from './contracts.ts';

export type TipoDeOportunidad = 'evergreen' | 'actualidad';
export type EntradaDeOportunidad = { tipo: TipoDeOportunidad; evidencias?: Array<{ label: string; url: string; publishedAt: string }> };
export type DecisionDeOportunidad = | { produce: true; tipo: TipoDeOportunidad; motivo: string } | { produce: false; motivo: string; alternativa: 'evergreen' };
export function evaluarOportunidad(entrada: EntradaDeOportunidad): DecisionDeOportunidad {
  if (entrada.tipo === 'evergreen') return { produce: true, tipo: 'evergreen', motivo: 'Una pieza evergreen no depende del Radar.' };
  const evidencias = entrada.evidencias ?? [];
  if (evidencias.length === 0) return { produce: false, motivo: 'Oportunidad de actualidad sin ninguna fuente verificable: no se produce.', alternativa: 'evergreen' };
  return { produce: true, tipo: 'actualidad', motivo: `Actualidad con ${evidencias.length} fuente(s) verificable(s).` };
}

export function invocaVideoDirector(formato: SalidaStrategist['recommended_format']): boolean { return formato === 'video'; }

export type EstadoFinal = 'pending_approval' | 'blocked' | 'review_pending';
export type EstadoDeColaTrasRevision = 'draft' | 'pending_approval';
export type RutaTrasRevision = | { accion: 'finalizar'; estado: EstadoFinal; motivo: string } | { accion: 'autocorregir'; cambios: string[] };
export function rutaTrasRevision(revision: SalidaBrandReviewer, autocorreccionesYaUsadas: number): RutaTrasRevision {
  if (revision.verdict === 'PASS') return { accion: 'finalizar', estado: 'pending_approval', motivo: 'El Brand Reviewer da PASS.' };
  if (revision.verdict === 'BLOCK') return { accion: 'finalizar', estado: 'blocked', motivo: revision.block_reasons.join(' ') };
  if (autocorreccionesYaUsadas >= 1) return { accion: 'finalizar', estado: 'blocked', motivo: `Sigue habiendo problemas tras la autocorrección: ${revision.required_fixes.join(' ')}` };
  return { accion: 'autocorregir', cambios: revision.required_fixes };
}
export function rutaSinRevision(): RutaTrasRevision { return { accion: 'finalizar', estado: 'review_pending', motivo: 'El Brand Reviewer no ha devuelto veredicto.' }; }
export function estadoDeColaTrasRevision(ruta: RutaTrasRevision): EstadoDeColaTrasRevision {
  if (ruta.accion === 'finalizar' && ruta.estado === 'pending_approval') return 'pending_approval';
  return 'draft';
}

export type ResultadoDeEspecialista<T> = | { estado: 'ok'; datos: T } | { estado: 'invalido'; error: string } | { estado: 'caido'; error: string };
export type Recuperacion = | { accion: 'reintentar'; especialista: Especialista } | { accion: 'degradar'; especialista: Especialista; motivo: string } | { accion: 'abortar'; especialista: Especialista; motivo: string };
export function recuperarDe(especialista: Especialista, reintentosYaUsados: number): Recuperacion {
  if (reintentosYaUsados < 1) return { accion: 'reintentar', especialista };
  if (ES_CRITICO[especialista]) return { accion: 'abortar', especialista, motivo: `${especialista} es crítico y no ha devuelto nada utilizable.` };
  return { accion: 'degradar', especialista, motivo: `${especialista} no es crítico: la pieza continúa sin su aportación.` };
}
export function esCopyPobre(copy: SalidaCopywriter): boolean {
  const hooksDistintos = new Set(copy.hooks.map((h) => h.trim().toLowerCase())).size;
  return hooksDistintos < 3 || copy.spoken_script.trim().split(/\s+/).length < 12;
}

export type PaqueteDeContexto = { especialista: Especialista; documentos: string[]; datos: Record<string, unknown> };

/**
 * Contexto mínimo por especialista. PRELAUNCH_CONTENT es transversal en los
 * roles que pueden crear o aprobar una promesa: Strategist, Copywriter y Brand
 * Reviewer. Así el modo prelaunch no depende de que cada prompt recuerde sus
 * límites por casualidad.
 */
export const DOCUMENTOS_POR_ESPECIALISTA: Record<Especialista, string[]> = {
  strategist: [
    'marketing/PRODUCT_TRUTH.md',
    'marketing/PRELAUNCH_CONTENT.md',
    'marketing/STRATEGY.md',
    'marketing/editorial-queue.json',
    'marketing/creative-reset-2026-08-22.md',
  ],
  copywriter: ['brand/VOICE.md', 'brand/CONTENT_RULES.md', 'marketing/PRELAUNCH_CONTENT.md'],
  'creative-director': ['brand/BRAND.md', 'marketing/IMAGE_PIPELINE.md', 'marketing/CREATIVE_FACTORY.md'],
  'video-director': ['marketing/SEEDANCE_PIPELINE.md'],
  'brand-reviewer': ['brand/BRAND.md', 'brand/VOICE.md', 'brand/CONTENT_RULES.md', 'marketing/PRODUCT_TRUTH.md', 'marketing/PRELAUNCH_CONTENT.md'],
};
export function paqueteDeContexto(especialista: Especialista, datos: Record<string, unknown>): PaqueteDeContexto { return { especialista, documentos: DOCUMENTOS_POR_ESPECIALISTA[especialista], datos }; }

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
