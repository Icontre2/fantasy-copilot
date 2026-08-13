import type { z } from 'zod';
import { DEFAULT_HEADERS, LALIGA_PRIVATE_BASE_URL, LALIGA_PUBLIC_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { LaligaError } from './errors';

/**
 * Cliente HTTP del conector. Todo el trafico hacia LALIGA sale de aqui.
 *
 * Las lecturas pueden reintentarse. Las escrituras viven en `writes.ts` y no
 * se reintentan nunca: ante una respuesta incierta se relee el mercado.
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

type FetchOptions = {
  /** Bearer de la sesion. Sin el, la peticion va al host publico. */
  accessToken?: string;
};

async function fetchAndParse<T>(
  baseUrl: string,
  path: string,
  schema: z.ZodType<T>,
  options: FetchOptions = {},
): Promise<T> {
  const url = new URL(path, baseUrl);
  url.searchParams.set('x-lang', 'es');

  for (let attempt = 0; attempt <= 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          ...DEFAULT_HEADERS,
          'x-lang': 'es',
          ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (attempt < 2) {
        await delay(250 * 2 ** attempt);
        continue;
      }
      const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
      throw new LaligaError(isTimeout ? 'timeout' : 'network', `Fallo al consultar ${path}.`, path);
    }

    if (response.status === 401 || response.status === 403) {
      throw new LaligaError('unauthorized', 'La sesion de LALIGA no es valida.', path, response.status);
    }
    if (response.status === 404) {
      throw new LaligaError('not_found', 'Recurso no encontrado.', path, 404);
    }
    if (!response.ok) {
      if (attempt < 2 && shouldRetry(response.status)) {
        await delay(250 * 2 ** attempt);
        continue;
      }
      throw new LaligaError('upstream', `LALIGA respondio ${response.status}.`, path, response.status);
    }

    const raw = await response.json().catch(() => {
      throw new LaligaError('invalid_response', 'La respuesta no es JSON.', path);
    });

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      // Un cambio de contrato en LALIGA revienta AQUI, con el campo concreto,
      // no tres capas mas arriba con un undefined silencioso.
      const issue = parsed.error.issues[0];
      const detail = issue ? `${issue.path.join('.') || '(raiz)'}: ${issue.message}` : 'desconocido';
      throw new LaligaError('invalid_response', `Respuesta inesperada en ${path} -> ${detail}`, path);
    }
    return parsed.data;
  }

  throw new LaligaError('network', `Fallo al consultar ${path}.`, path);
}

/** GET al host publico (catalogo, cotizaciones). Sin credenciales. */
export function publicFetch<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return fetchAndParse(LALIGA_PUBLIC_BASE_URL, path, schema);
}

/** GET al host privado con el Bearer de la sesion del usuario. */
export function privateFetch<T>(path: string, accessToken: string, schema: z.ZodType<T>): Promise<T> {
  return fetchAndParse(LALIGA_PRIVATE_BASE_URL, path, schema, { accessToken });
}
