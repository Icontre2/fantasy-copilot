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

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
