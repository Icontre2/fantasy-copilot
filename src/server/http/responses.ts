// Ruta relativa: el alias `@/` solo existe al compilar, y este modulo se importa
// desde pruebas que se ejecutan con node a pelo.
import { LaligaError, toHttpStatus, toPublicMessage } from '../laliga/errors.ts';

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
 *
 * ── El filtro de abajo no es paranoia ────────────────────────────────────────
 * Este helper tenia una llamada con `...(hayError ? limpiarError() : [])`.
 * Extender un STRING en un array reparte sus letras: en vez de una cookie
 * salian sesenta cabeceras de un caracter, y la cookie que se queria caducar
 * seguia viva. Sin error en ningun log. Se descarta lo que no tiene forma de
 * cookie y se deja constancia, que es lo que faltaba.
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
    if (!pareceCookie(cookie)) {
      console.error('[fantasy] se ha intentado poner una cookie con forma invalida; se descarta');
      continue;
    }
    headers.append('Set-Cookie', cookie);
  }
  return new Response(JSON.stringify(data), { status, headers });
}

/** Un `nombre=valor` con nombre. Lo minimo para no mandar basura al navegador. */
export function pareceCookie(valor: string): boolean {
  const igual = valor.indexOf('=');
  return igual > 0 && !/[\s;]/.test(valor.slice(0, igual));
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
