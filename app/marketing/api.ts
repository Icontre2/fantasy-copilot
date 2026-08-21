"use client";

/**
 * Cliente de `/api/marketing/*`. Mismo patrón que `app/fantasy/api.ts`
 * (nunca se habla con Supabase directamente desde el navegador), en un
 * fichero propio: el panel de marketing no importa nada de `app/fantasy/`.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/marketing/${path}`, { credentials: "same-origin", ...init });

  if (!response.ok) {
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
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
