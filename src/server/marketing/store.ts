// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { credencialAdmin, credencialDeUsuario, type Credencial } from '../auth/links.ts';
import { estadoHumanoSchema, type EstadoHumano } from './state.ts';

/**
 * El estado humano de cada paquete, guardado en Supabase.
 *
 * Mismo patrón que `links.ts`: se habla con PostgREST por HTTP con una
 * credencial explícita, nunca con el cliente de Supabase (que ata la
 * credencial al construirse, y aquí cambia en cada petición). Se prefiere el
 * JWT de quien ha entrado sobre `service_role` — que hoy ni siquiera está
 * configurada en producción — porque con las políticas de la tabla puestas
 * (ver la migración) funciona igual y con menos privilegio.
 */

const TABLA = 'marketing_review_state';

/** Con qué credencial hablar con la base para esta petición. Admin si existe; si no, el JWT de quien ha entrado. */
export function credencialDeMarketing(accessToken: string): Credencial | null {
  return credencialDeUsuario(accessToken) ?? credencialAdmin();
}

async function pedir(credencial: Credencial, ruta: string, init: RequestInit & { prefer?: string } = {}): Promise<Response> {
  const { prefer, ...resto } = init;
  return fetch(`${credencial.url}/rest/v1/${ruta}`, {
    ...resto,
    headers: {
      apikey: credencial.apikey,
      Authorization: `Bearer ${credencial.bearer}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
}

type Fila = { content_id: string; datos: unknown };

/** El estado humano guardado de este paquete, o `null` si nunca se ha tocado. */
export async function leerEstado(credencial: Credencial, contentId: string): Promise<EstadoHumano | null> {
  const respuesta = await pedir(credencial, `${TABLA}?content_id=eq.${encodeURIComponent(contentId)}&select=content_id,datos&limit=1`);
  if (!respuesta.ok) return null;

  const filas = (await respuesta.json().catch(() => null)) as Fila[] | null;
  const fila = filas?.[0];
  if (!fila) return null;

  const validado = estadoHumanoSchema.safeParse(fila.datos);
  return validado.success ? validado.data : null;
}

/** Guarda (o reemplaza) el estado humano de un paquete. */
export async function guardarEstado(credencial: Credencial, estado: EstadoHumano): Promise<void> {
  const respuesta = await pedir(credencial, `${TABLA}?on_conflict=content_id`, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({ content_id: estado.contentId, datos: estado, updated_at: new Date().toISOString() }),
  });
  if (!respuesta.ok) {
    throw new Error(`No se pudo guardar el estado de ${estado.contentId}: HTTP ${respuesta.status}`);
  }
}
