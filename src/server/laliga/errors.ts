/** Errores tipados del conector, para mapearlos a codigos HTTP claros. */

export type LaligaErrorKind =
  | 'network' // no se pudo contactar con la API
  | 'timeout' // la API no respondio a tiempo
  | 'unauthorized' // sesion ausente o caducada
  | 'not_found' // recurso inexistente
  | 'upstream' // la API respondio con error
  | 'invalid_response'; // la respuesta no encaja con el esquema esperado

export class LaligaError extends Error {
  readonly kind: LaligaErrorKind;
  readonly status: number;
  readonly endpoint: string;

  constructor(kind: LaligaErrorKind, message: string, endpoint: string, status?: number) {
    super(message);
    this.name = 'LaligaError';
    this.kind = kind;
    this.endpoint = endpoint;
    this.status = status ?? defaultStatus(kind);
  }
}

function defaultStatus(kind: LaligaErrorKind): number {
  switch (kind) {
    case 'unauthorized':
      return 401;
    case 'not_found':
      return 404;
    case 'timeout':
      return 504;
    default:
      return 502;
  }
}

export function toHttpStatus(error: unknown): number {
  if (error instanceof LaligaError) return error.status;
  return 500;
}

export function toPublicMessage(error: unknown): string {
  if (error instanceof LaligaError) {
    switch (error.kind) {
      case 'unauthorized':
        return 'La sesion de LALIGA no es valida o ha caducado. Vuelve a iniciar sesion.';
      case 'timeout':
        return 'La API de LALIGA tardo demasiado en responder.';
      case 'network':
        return 'No se pudo contactar con la API de LALIGA.';
      case 'not_found':
        return 'El recurso solicitado no existe en la API de LALIGA.';
      case 'invalid_response':
        return 'La API de LALIGA devolvio un formato inesperado.';
      case 'upstream':
        return 'La API de LALIGA devolvio un error.';
    }
  }
  return 'Error inesperado al consultar LALIGA Fantasy.';
}
