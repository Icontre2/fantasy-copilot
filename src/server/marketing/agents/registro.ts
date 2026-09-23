// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Especialista, SalidaBrandReviewer } from './contracts.ts';

/**
 * El registro de ejecución (§24): qué pasó en cada tanda y por qué.
 *
 * ── Para qué sirve, en una frase ────────────────────────────────────────────
 * «Permitirá saber POR QUÉ se bloquea Claude en lugar de adivinarlo». Hoy,
 * cuando una pieza sale mal, lo único que queda es el `package.json` final: no
 * se sabe qué etapa tardó, cuál reintentó, ni si el bloqueo vino del revisor o
 * de una llamada que falló. Eso convierte cada diagnóstico en arqueología.
 *
 * ── Por qué hay dos motores y el registro lo dice ───────────────────────────
 * `RegistroDeEjecucion` en `policy.ts` se diseñó para el Orchestrator, que sí
 * tiene veredictos PASS/FIX/BLOCK y una autocorrección. La pipeline del SDK
 * (`marketing:generate`) NO tiene ninguna de las dos cosas: ejecuta cinco
 * etapas seguidas y guarda el resultado. Meter sus datos en aquel molde
 * obligaría a inventarle un veredicto que nunca emitió.
 *
 * Por eso el motor va explícito y los campos que un motor no tiene van a
 * `null`. Un `null` aquí significa «este motor no tiene ese concepto», que es
 * información; un valor por defecto significaría «no pasó», que sería mentira.
 */

export type Motor = 'pipeline' | 'orchestrator';

export type EtapaMedida = {
  agente: Especialista;
  ms: number;
  inputTokens: number;
  outputTokens: number;
};

export type RegistroDeTanda = {
  run_id: string;
  timestamp: string;
  motor: Motor;
  content_id: string;
  opportunity_id: string | null;
  /** Etapas que llegaron a ejecutarse, en orden, con lo que costó cada una. */
  etapas: EtapaMedida[];
  ms_total: number;
  input_tokens: number;
  output_tokens: number;
  /** Solo el Orchestrator emite veredicto. La pipeline devuelve `null`. */
  reviewer_verdict: SalidaBrandReviewer['verdict'] | null;
  /** `null` en la pipeline: no existe la autocorrección en ese motor. */
  autocorrection_used: boolean | null;
  /** El QA que quedó escrito en el paquete, cuando lo hay. */
  qa_pass: boolean | null;
  final_status: string;
  /** Mensaje del fallo si la tanda no llegó al final. */
  error: string | null;
};

/** Un id de ejecución legible y ordenable: `RUN-<fecha compacta>-<hora>-<azar>`. */
export function nuevoRunId(ahora: Date = new Date()): string {
  const iso = ahora.toISOString();
  const compacta = `${iso.slice(0, 10).replaceAll('-', '')}-${iso.slice(11, 19).replaceAll(':', '')}`;
  return `RUN-${compacta}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Dónde vive el registro de un día. */
export function rutaDelRegistro(raiz: string, fecha: string): string {
  return path.join(raiz, 'marketing', 'runs', `${fecha}.jsonl`);
}

/**
 * Añade una línea al registro del día.
 *
 * Es JSONL y se APILA, no se reescribe: dos tandas del mismo día son dos
 * ejecuciones distintas y perder la primera al escribir la segunda destruiría
 * justo lo que este fichero existe para conservar. Y nunca lanza: un registro
 * que tumba la tanda que estaba registrando es peor que no tener registro.
 */
export async function anotarTanda(raiz: string, fecha: string, registro: RegistroDeTanda): Promise<void> {
  try {
    const ruta = rutaDelRegistro(raiz, fecha);
    await mkdir(path.dirname(ruta), { recursive: true });
    await appendFile(ruta, `${JSON.stringify(registro)}\n`, 'utf8');
  } catch {
    // Deliberadamente en silencio: ver arriba.
  }
}

/** Un resumen de una línea por tanda, para enseñar al final de la ejecución. */
export function resumirTanda(registro: RegistroDeTanda): string {
  const segundos = (registro.ms_total / 1000).toFixed(1);
  const etapas = registro.etapas.map((e) => `${e.agente} ${(e.ms / 1000).toFixed(1)}s`).join(' · ');
  const cola = registro.error !== null ? ` · ERROR: ${registro.error}` : '';
  return `${registro.content_id} · ${registro.final_status} · ${segundos}s · ${registro.input_tokens}/${registro.output_tokens} tokens${etapas ? ` · ${etapas}` : ''}${cola}`;
}

/**
 * La etapa más lenta de una tanda. Es lo primero que se mira cuando una tanda
 * tarda de más, y calcularlo aquí evita que cada consumidor lo reinvente.
 * `null` si no llegó a ejecutarse ninguna.
 */
export function etapaMasLenta(registro: RegistroDeTanda): EtapaMedida | null {
  return registro.etapas.reduce<EtapaMedida | null>((peor, etapa) => (peor === null || etapa.ms > peor.ms ? etapa : peor), null);
}
