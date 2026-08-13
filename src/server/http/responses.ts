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

/**
 * Respuesta que ademas fija cookies. Acepta varias porque la sesion cifrada se
 * trocea cuando no cabe en una sola (ver `session.ts`), y `Set-Cookie` es la
 * unica cabecera que se repite en vez de concatenarse.
 */
export function privateJsonWithCookies(
  data: unknown,
  cookies: string | string[],
  status = 200,
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Cookie',
  });
  for (const cookie of Array.isArray(cookies) ? cookies : [cookies]) {
    headers.append('Set-Cookie', cookie);
  }
  return new Response(JSON.stringify(data), { status, headers });
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
