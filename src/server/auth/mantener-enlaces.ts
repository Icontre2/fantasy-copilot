// Rutas relativas: este módulo lo usa el cron y su parte pura se prueba en node.
import { actualizarTokens, claveDeEnlace, credencialAdmin, leerEnlace, uuidDeIdentidad } from './links.ts';
import { refreshTokens } from '../laliga/auth.ts';

/**
 * Mantiene vivos los enlaces Google ↔ LALIGA.
 *
 * El permiso que da LALIGA (el refresh token) caduca si pasa unas dos semanas
 * sin usarse. Un enlace guardado y no usado se moría solo, y como LALIGA ya no
 * deja entrar con email y contraseña, recuperarlo cuesta. Así que el repaso
 * horario lo renueva una vez al día: cada renovación trae un permiso nuevo con
 * su plazo entero.
 */

const HORA = 3_600_000;
/** Se renueva si la última vez fue hace más de esto. Con el repaso cada hora, sale a diario. */
export const RENOVAR_TRAS_MS = 20 * HORA;

export function toca(actualizadoEn: string, ahora: Date): boolean {
  const t = Date.parse(actualizadoEn);
  return Number.isNaN(t) || ahora.getTime() - t >= RENOVAR_TRAS_MS;
}

type Fila = { id: string; updated_at: string };

export async function mantenerEnlacesVivos(ahora = new Date()): Promise<{ renovados: number; caducados: number; revisados: number }> {
  const credencial = credencialAdmin();
  if (!credencial) return { renovados: 0, caducados: 0, revisados: 0 };

  const respuesta = await fetch(`${credencial.url}/rest/v1/fantasy_links?select=id,updated_at`, {
    headers: { apikey: credencial.apikey, Authorization: `Bearer ${credencial.bearer}` },
  });
  if (!respuesta.ok) throw new Error(`No se pudieron leer los enlaces: HTTP ${respuesta.status}`);
  const filas = ((await respuesta.json()) as Fila[]).filter((f) => toca(f.updated_at, ahora));

  let renovados = 0;
  let caducados = 0;
  for (const fila of filas) {
    const uuid = uuidDeIdentidad(fila.id);
    if (!uuid) continue;
    const clave = await claveDeEnlace(credencial, uuid);
    if (!clave) continue;
    const enlace = await leerEnlace(credencial, fila.id, clave).catch(() => null);
    if (!enlace) continue;
    try {
      const nuevos = await refreshTokens(enlace.tokens.refreshToken);
      await actualizarTokens(credencial, fila.id, nuevos, clave);
      renovados += 1;
    } catch {
      // Ya caducado: no se borra. «Continuar con Google» lo dirá y se reconecta.
      caducados += 1;
    }
  }
  return { renovados, caducados, revisados: filas.length };
}
