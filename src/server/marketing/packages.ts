// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { paqueteCrudoSchema, type Estado, type PaqueteCrudo, type QAResult } from './schemas.ts';
import { estadoHumanoVacio, type EstadoHumano } from './state.ts';

/**
 * Lectura de `marketing/generated/**\/package.json`, sin romper nunca el panel.
 *
 * ── Por qué esto puede fallar, y por qué eso está bien ───────────────────────
 * Estos ficheros los escribe un script (`prepare-agent-queue.mjs`) que hoy
 * corre a mano, fuera de esta app. Un fichero a medio escribir, con un campo
 * mal puesto, o de la convención antigua que nadie llegó a ejecutar, es un
 * caso esperado — no una excepción de programa. Un paquete que no se puede
 * leer se enseña como `blocked` con el motivo, y el resto de la cola sigue
 * funcionando.
 */

const CARPETA_GENERADOS = path.join(process.cwd(), 'marketing', 'generated');

export type PaqueteBloqueado = { blocked: true; id: string; date: string; error: string };
export type PaqueteLeido = { blocked: false; crudo: PaqueteCrudo };
export type ResultadoDeLectura = PaqueteBloqueado | PaqueteLeido;

/** Todas las rutas `marketing/generated/<fecha>/<id>/package.json` que existen. */
export async function listarRutasDePaquetes(): Promise<Array<{ fecha: string; id: string; ruta: string }>> {
  const rutas: Array<{ fecha: string; id: string; ruta: string }> = [];

  const fechas = await readdir(CARPETA_GENERADOS, { withFileTypes: true }).catch(() => []);
  for (const fecha of fechas) {
    if (!fecha.isDirectory()) continue;
    const carpetaFecha = path.join(CARPETA_GENERADOS, fecha.name);
    const ids = await readdir(carpetaFecha, { withFileTypes: true }).catch(() => []);
    for (const id of ids) {
      if (!id.isDirectory()) continue;
      rutas.push({ fecha: fecha.name, id: id.name, ruta: path.join(carpetaFecha, id.name, 'package.json') });
    }
  }
  return rutas;
}

/**
 * Normaliza los alias más obvios de la convención vieja (snake_case) sin
 * intentar dar soporte completo a algo que nunca tuvo código. Si el fichero ya
 * viene en la convención buena, esto no cambia nada.
 */
function normalizarAlias(crudo: Record<string, unknown>): Record<string, unknown> {
  const normalizado = { ...crudo };
  if (normalizado.needsCapture === undefined && typeof normalizado.needs_capture === 'boolean') {
    normalizado.needsCapture = normalizado.needs_capture;
  }
  if (normalizado.hook === undefined && typeof normalizado.insight === 'string') {
    normalizado.hook = normalizado.insight;
  }
  const qaViejo = normalizado.qa as Record<string, unknown> | null | undefined;
  if (qaViejo && typeof qaViejo === 'object' && qaViejo.pass === undefined) {
    const { brand_pass, product_truth_pass, facts_pass, notes } = qaViejo as Record<string, unknown>;
    if (typeof brand_pass === 'boolean' || typeof product_truth_pass === 'boolean' || typeof facts_pass === 'boolean') {
      normalizado.qa = {
        pass: Boolean(brand_pass) && Boolean(product_truth_pass) && Boolean(facts_pass),
        blockedReasons: [],
        warnings: Array.isArray(notes) ? notes : [],
        requiredChanges: [],
      };
    }
  }
  return normalizado;
}

/** Lee y valida un paquete. Nunca lanza: un fallo se convierte en `blocked`. */
export async function leerPaquete(fecha: string, id: string, ruta: string): Promise<ResultadoDeLectura> {
  let texto: string;
  try {
    texto = await readFile(ruta, 'utf8');
  } catch {
    return { blocked: true, id, date: fecha, error: 'No se ha podido leer el fichero package.json.' };
  }

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { blocked: true, id, date: fecha, error: 'El fichero package.json no es JSON válido.' };
  }

  const conAlias = json && typeof json === 'object' ? normalizarAlias(json as Record<string, unknown>) : json;
  const validado = paqueteCrudoSchema.safeParse(conAlias);
  if (!validado.success) {
    const primerError = validado.error.issues[0];
    const detalle = primerError ? `${primerError.path.join('.') || '(raíz)'}: ${primerError.message}` : 'formato inválido';
    return { blocked: true, id, date: fecha, error: `El paquete no cumple el esquema (${detalle}).` };
  }

  return { blocked: false, crudo: validado.data };
}

/**
 * Lo que ve el panel: el contenido estático del fichero, con las decisiones
 * humanas de Supabase por encima. El estado humano manda en cuanto existe;
 * mientras no exista, manda el `status` del fichero.
 */
export type VistaDePaquete = {
  id: string;
  date: string;
  blocked: false;
  status: Estado;
  score: number;
  problem: string;
  feature: string;
  hook: string;
  hooks: string[];
  needsCapture: boolean;
  strategy: PaqueteCrudo['strategy'];
  script: string | null;
  captions: PaqueteCrudo['captions'];
  cta: string | null;
  shots: PaqueteCrudo['shots'];
  imagePrompt: string | null;
  seedancePrompt: string | null;
  videoSequence: PaqueteCrudo['videoSequence'];
  negativeConstraints: string[];
  platforms: string[];
  formats: string[];
  sources: PaqueteCrudo['sources'];
  qa: QAResult | null;
  needsReReview: boolean;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  captures: EstadoHumano['captures'];
  auditTrail: EstadoHumano['auditTrail'];
};

export type VistaBloqueada = { id: string; date: string; blocked: true; error: string };
export type Vista = VistaDePaquete | VistaBloqueada;

/** Junta el fichero estático con el estado humano. El humano gana si existe. */
export function fusionarPaquete(resultado: ResultadoDeLectura, humano: EstadoHumano | null): Vista {
  if (resultado.blocked) return { id: resultado.id, date: resultado.date, blocked: true, error: resultado.error };

  const { crudo } = resultado;
  const efectivo = humano ?? estadoHumanoVacio(crudo.id, crudo.date);

  // Las ediciones humanas SOBRESCRIBEN el contenido creativo del fichero,
  // nunca lo reescriben en disco: por eso el override vive aparte y se aplica
  // solo al fusionar.
  const hook = efectivo.edits?.hook ?? crudo.hook;
  const script = efectivo.edits?.script ?? crudo.script ?? null;
  const captions = efectivo.edits?.captions ?? crudo.captions ?? null;
  const cta = efectivo.edits?.cta ?? crudo.cta ?? null;

  return {
    id: crudo.id,
    date: crudo.date,
    blocked: false,
    status: efectivo.status ?? crudo.status,
    score: crudo.score,
    problem: crudo.problem,
    feature: crudo.feature,
    hook,
    hooks: crudo.hooks ?? (crudo.hook ? [crudo.hook] : []),
    needsCapture: crudo.needsCapture,
    strategy: crudo.strategy ?? null,
    script,
    captions,
    cta,
    shots: crudo.shots ?? [],
    imagePrompt: crudo.imagePrompt ?? null,
    seedancePrompt: crudo.seedancePrompt ?? null,
    videoSequence: crudo.videoSequence ?? [],
    negativeConstraints: crudo.negativeConstraints ?? [],
    platforms: crudo.platforms ?? [],
    formats: crudo.formats ?? [],
    sources: crudo.sources ?? [],
    qa: efectivo.qa ?? crudo.qa ?? null,
    needsReReview: efectivo.needsReReview,
    rejectionReason: efectivo.rejectionReason,
    approvedAt: efectivo.approvedAt,
    approvedBy: efectivo.approvedBy,
    rejectedAt: efectivo.rejectedAt,
    rejectedBy: efectivo.rejectedBy,
    captures: efectivo.captures,
    auditTrail: efectivo.auditTrail,
  };
}

/**
 * El orden de la cola (fase 2): primero lo que hay que decidir, luego lo
 * bloqueado —que también hay que atender—, luego el resto, y dentro de cada
 * grupo, lo más nuevo primero.
 */
export function ordenDeCola(vistas: Vista[]): Vista[] {
  const prioridad = (v: Vista): number => {
    if (v.blocked) return 1;
    if (v.status === 'pending_approval') return 0;
    return 2;
  };
  return [...vistas].sort((a, b) => {
    const diferencia = prioridad(a) - prioridad(b);
    if (diferencia !== 0) return diferencia;
    return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
  });
}
