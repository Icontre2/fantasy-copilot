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
  /**
   * Codigo del catalogo de Azure B2C (`AADB2C90225`), cuando lo hay.
   *
   * Existe porque `message` se traduce a lenguaje humano en el momento de
   * lanzarlo, y ahi el codigo se pierde. Sin guardarlo aparte, el registro de
   * accesos no podia distinguir «contraseña mal» de «cuenta social sin
   * contraseña» — justamente el numero que hace falta para decidir si merece la
   * pena arreglar el acceso social.
   *
   * NO se enseña al usuario ni viaja en la respuesta: es una constante del
   * catalogo de Microsoft, no un dato de nadie.
   */
  readonly codigoProveedor: string | null;

  constructor(
    kind: LaligaErrorKind,
    message: string,
    endpoint: string,
    status?: number,
    codigoProveedor?: string | null,
  ) {
    super(message);
    this.name = 'LaligaError';
    this.kind = kind;
    this.endpoint = endpoint;
    this.status = status ?? defaultStatus(kind);
    this.codigoProveedor = codigoProveedor ?? null;
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

/**
 * Mensaje para el usuario.
 *
 * Conserva el detalle real en vez de sustituirlo por una frase generica. La
 * version anterior devolvia "Error inesperado al consultar LALIGA Fantasy" para
 * cualquier fallo que no fuera un `LaligaError`, y eso tapaba justo los errores
 * de configuracion del despliegue (clave de cifrado ausente o corta, sesion que
 * no cabe en la cookie): el usuario veia una frase que culpaba a LALIGA de un
 * problema que estaba en casa, y no habia forma de diagnosticarlo sin acceso a
 * los logs del servidor.
 *
 * Ninguno de estos mensajes incluye secretos: son los que escribe este propio
 * codigo, o la descripcion de error que devuelve el login de LALIGA.
 */
export function toPublicMessage(error: unknown): string {
  if (error instanceof LaligaError) {
    switch (error.kind) {
      case 'unauthorized':
        // Se pasa tal cual: quien lanza este error ya ha puesto un mensaje
        // concreto y en castellano. Los del login vienen traducidos de Azure B2C
        // por `auth-errors.ts`; una frase generica aqui los perderia.
        return error.message;
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
  // Fallo que no viene de LALIGA: casi siempre configuracion del despliegue.
  const detail = error instanceof Error ? error.message : String(error);
  return `Error interno de la aplicacion (no es culpa de LALIGA): ${detail}`;
}
