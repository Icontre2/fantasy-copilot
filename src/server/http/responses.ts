import { LaligaError, toHttpStatus, toPublicMessage } from '@/src/server/laliga/errors';

/**
 * Helpers de respuesta. Todo lo que depende de la sesion del usuario sale con
 * `Cache-Control: no-store`: son datos de su liga, no pueden quedar en un proxy.
 */

export function privateJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Cookie',
    },
  });
}

export function privateJsonWithCookie(data: unknown, cookie: string, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Cookie',
      'Set-Cookie': cookie,
    },
  });
}

/** Descarga de CSV. `filename` ya debe venir saneado por quien construye el fichero. */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export function errorJson(error: unknown): Response {
  if (!(error instanceof LaligaError)) {
    // Los errores esperados de LALIGA no ensucian el log; los inesperados si.
    console.error('[fantasy] error no controlado:', error);
  }
  return privateJson(
    {
      error: toPublicMessage(error),
      kind: error instanceof LaligaError ? error.kind : 'unknown',
    },
    toHttpStatus(error),
  );
}
