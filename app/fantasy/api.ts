"use client";

/**
 * Cliente de las rutas propias. El navegador NUNCA habla con LALIGA: siempre
 * pasa por `/api/fantasy/*`, que es donde vive el token y toda la logica.
 */

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: "same-origin", ...init });

  if (!response.ok) {
    // Las rutas devuelven `{ error }`; si el fallo es de red o del runtime, no.
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `La petición falló (${response.status}).`);
  }

  return (await response.json()) as T;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

/**
 * Lo mismo, pero recordando la respuesta un rato.
 *
 * ── Para qué existe ─────────────────────────────────────────────────────────
 * Hay dos lecturas caras de verdad: el once probable de un manager, que cruza
 * las alineaciones de una docena de clubes, y el histórico de una plantilla,
 * que baja la cotización de unos veinticuatro jugadores. Sin esto, cerrar la
 * ficha de un rival y volver a abrirla la descargaba entera otra vez, y volver
 * a Inicio repetía la tuya. Esa espera repetida es lo que hace que una app se
 * sienta una web.
 *
 * Se guarda la PROMESA y no el resultado, así dos componentes que pidan lo
 * mismo a la vez comparten una sola petición en vez de lanzar dos.
 *
 * ── Por qué caduca, y por qué se puede borrar a mano ────────────────────────
 * Estos datos cambian: un valor de mercado se mueve a diario y una plantilla
 * cambia en cuanto alguien paga una cláusula. Cinco minutos es corto para que
 * nadie tome una decisión sobre una cifra vieja, y largo para cubrir el ir y
 * venir entre pantallas, que es el caso que molesta.
 *
 * Y como una compra no espera cinco minutos, `olvidarCache()` lo tira entero:
 * lo llama el mismo refresco que ya se dispara tras pujar o clausular.
 */
const CACHE_MS = 5 * 60_000;
const memoria = new Map<string, { guardadoEn: number; promesa: Promise<unknown> }>();

export function getCacheado<T>(path: string): Promise<T> {
  const ahora = Date.now();
  const guardada = memoria.get(path);
  if (guardada && ahora - guardada.guardadoEn < CACHE_MS) return guardada.promesa as Promise<T>;

  const promesa = request<T>(path);
  memoria.set(path, { guardadoEn: ahora, promesa });
  /*
   * Un fallo NO se queda guardado: si se cachea el error, reintentar devuelve
   * el mismo error sin volver a preguntar y la pantalla se queda rota cinco
   * minutos. Se comprueba que la entrada siga siendo esta antes de borrarla,
   * para no tirar una petición posterior que sí haya ido bien.
   */
  promesa.catch(() => {
    if (memoria.get(path)?.promesa === promesa) memoria.delete(path);
  });
  return promesa;
}

/** Tras mover dinero, lo guardado ya no describe la liga. */
export function olvidarCache(): void {
  memoria.clear();
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
