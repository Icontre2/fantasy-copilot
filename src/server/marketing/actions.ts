import { ESTADOS_EDITABLES, type CapturaReal, type Estado, type QAResult } from './schemas.ts';
import type { EstadoHumano, Ediciones } from './state.ts';

/**
 * Las cinco acciones que puede hacer una persona desde el panel, y las reglas
 * que las gobiernan.
 *
 * Puro a propósito: nada de aquí toca la red. Recibe el estado actual y el
 * contexto EFECTIVO (el que ya ha resuelto si manda el fichero o el estado
 * humano — ver `fusionarPaquete`), y devuelve el estado humano SIGUIENTE o
 * lanza `TransicionInvalida`. Así se puede probar cada regla sin Supabase de
 * por medio, y la ruta de la API solo tiene que atrapar el error y convertirlo
 * en un 400.
 */

export class TransicionInvalida extends Error {}

export type ContextoEfectivo = { status: Estado; qa: QAResult | null; needsReReview: boolean };

function base(actual: EstadoHumano, ahora: string): EstadoHumano {
  return { ...actual, updatedAt: ahora };
}

/**
 * APROBAR. Las tres condiciones son las que pidió el encargo, y ninguna se
 * relaja: en `pending_approval`, con QA superado, y sin cambios sin revisar.
 */
export function aprobar(actual: EstadoHumano, contexto: ContextoEfectivo, actor: string, ahora: string): EstadoHumano {
  if (contexto.status !== 'pending_approval') {
    throw new TransicionInvalida(`No se puede aprobar: el paquete está en «${contexto.status}», no en pending_approval.`);
  }
  if (!contexto.qa || contexto.qa.pass !== true) {
    throw new TransicionInvalida('No se puede aprobar: no ha pasado el control de calidad.');
  }
  if (contexto.needsReReview) {
    throw new TransicionInvalida('No se puede aprobar: hay cambios editados pendientes de volver a revisar.');
  }
  return {
    ...base(actual, ahora),
    status: 'approved',
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    approvedAt: ahora,
    approvedBy: actor,
    auditTrail: [...actual.auditTrail, { action: 'approved', actor, timestamp: ahora }],
  };
}

/**
 * RECHAZAR. Solo antes de una decisión ya tomada, y el motivo es obligatorio:
 * un rechazo sin motivo no le sirve a nadie dentro de tres meses.
 */
export function rechazar(
  actual: EstadoHumano,
  contexto: ContextoEfectivo,
  motivo: string,
  actor: string,
  ahora: string,
): EstadoHumano {
  if (contexto.status === 'approved' || contexto.status === 'rejected') {
    throw new TransicionInvalida(`No se puede rechazar: el paquete ya está en «${contexto.status}».`);
  }
  if (!motivo.trim()) {
    throw new TransicionInvalida('Hace falta un motivo para rechazar.');
  }
  return {
    ...base(actual, ahora),
    status: 'rejected',
    approvedAt: null,
    approvedBy: null,
    rejectedAt: ahora,
    rejectedBy: actor,
    rejectionReason: motivo.trim(),
    auditTrail: [...actual.auditTrail, { action: 'rejected', actor, timestamp: ahora, note: motivo.trim() }],
  };
}

/**
 * EDITAR. Solo el contenido creativo (fase 4): nunca las fuentes, el score del
 * Radar, la feature de origen ni el historial de QA — eso ni siquiera se pasa
 * aquí, porque no forma parte de `Ediciones`.
 *
 * Cualquier edición marca `needsReReview`: el QA que hubiera pasado era sobre
 * el contenido de ANTES. Si el paquete estaba a punto de aprobarse
 * (`pending_approval`), retrocede a `brand_review` para que quede claro que
 * hace falta pasar otra vez por ahí antes de poder aprobar.
 */
export function editar(actual: EstadoHumano, contexto: ContextoEfectivo, cambios: Ediciones, actor: string, ahora: string): EstadoHumano {
  if (!ESTADOS_EDITABLES.includes(contexto.status)) {
    throw new TransicionInvalida(`No se puede editar en el estado «${contexto.status}». Reábrelo primero.`);
  }
  if (Object.keys(cambios).length === 0) {
    throw new TransicionInvalida('No hay ningún cambio que guardar.');
  }
  const siguienteStatus: Estado = contexto.status === 'pending_approval' ? 'brand_review' : contexto.status;
  return {
    ...base(actual, ahora),
    status: siguienteStatus,
    edits: { ...actual.edits, ...cambios },
    needsReReview: true,
    auditTrail: [...actual.auditTrail, { action: 'edited', actor, timestamp: ahora, note: Object.keys(cambios).join(', ') }],
  };
}

/**
 * MARCAR QA. Hoy lo hace una persona, no un agente: `.claude/agents/brand-reviewer.md`
 * es un prompt, no código que corra dentro de esta app. El resultado se
 * guarda igual de honesto que si lo hiciera un agente —con quién lo comprobó—
 * y `needsReReview` se limpia porque esto ES la revisión que faltaba.
 *
 * Un QA superado adelanta el estado a `pending_approval` si venía de antes;
 * uno no superado lo deja en `brand_review`, listo para otra vuelta.
 */
export function marcarQA(actual: EstadoHumano, contexto: ContextoEfectivo, resultado: QAResult, actor: string, ahora: string): EstadoHumano {
  if (contexto.status === 'approved' || contexto.status === 'rejected') {
    throw new TransicionInvalida(`No se puede revisar: el paquete ya está en «${contexto.status}». Reábrelo primero.`);
  }
  const conFecha: QAResult = { ...resultado, checkedAt: ahora, checkedBy: actor };
  return {
    ...base(actual, ahora),
    status: conFecha.pass ? 'pending_approval' : 'brand_review',
    qa: conFecha,
    needsReReview: false,
    auditTrail: [
      ...actual.auditTrail,
      { action: conFecha.pass ? 'qa_passed' : 'qa_failed', actor, timestamp: ahora, note: conFecha.blockedReasons.join('; ') || undefined },
    ],
  };
}

/**
 * REABRIR. La única forma de volver a tocar una pieza ya `approved` o
 * `rejected`. Vuelve a `brand_review` y exige QA otra vez, para que una
 * aprobación vieja no se quede pegada a un contenido que ha cambiado.
 */
export function reabrir(actual: EstadoHumano, contexto: ContextoEfectivo, actor: string, ahora: string): EstadoHumano {
  if (contexto.status !== 'approved' && contexto.status !== 'rejected') {
    throw new TransicionInvalida(`No hace falta reabrir: el paquete está en «${contexto.status}», no está decidido.`);
  }
  return {
    ...base(actual, ahora),
    status: 'brand_review',
    needsReReview: true,
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    auditTrail: [...actual.auditTrail, { action: 'reopened', actor, timestamp: ahora }],
  };
}

/**
 * ADJUNTAR UNA CAPTURA REAL (fase 5).
 *
 * Registrar un hecho, no tomar una decisión: por eso NO cambia el estado ni
 * marca `needsReReview`. Una captura no invalida el QA que ya se hizo sobre
 * el contenido; al contrario, es lo que ese QA pedía («el product proof
 * depende de capturas reales; no se genera UI falsa»).
 *
 * Se permite en cualquier estado, incluido `approved`: pegar la captura que
 * ya se ha tomado no debería obligar a reabrir y revisar la pieza entera.
 *
 * No se sube ningún fichero: `file` es una URL o una ruta que alguien pega.
 * Conectar almacenamiento externo es otra fase — esto es lo que hace falta
 * para no perder la pista de una captura que YA existe.
 */
export function adjuntarCaptura(
  actual: EstadoHumano,
  captura: CapturaReal,
  actor: string,
  ahora: string,
): EstadoHumano {
  if (!captura.type.trim()) throw new TransicionInvalida('Hace falta decir de qué pantalla es la captura.');
  if (!captura.file.trim()) throw new TransicionInvalida('Hace falta la URL o la ruta de la captura.');

  const nueva: CapturaReal = {
    type: captura.type.trim(),
    file: captura.file.trim(),
    ...(captura.description?.trim() ? { description: captura.description.trim() } : {}),
    // La fecha la pone el servidor, nunca el cliente: un historial con fechas
    // que puede fijar quien llama no sirve como historial.
    addedAt: ahora,
  };

  return {
    ...base(actual, ahora),
    captures: [...actual.captures, nueva],
    auditTrail: [
      ...actual.auditTrail,
      { action: 'capture_added', actor, timestamp: ahora, note: nueva.type },
    ],
  };
}
