// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import type { Credencial } from '../auth/links.ts';
import {
  fusionarPaquete,
  leerPaquete,
  listarRutasDePaquetes,
  ordenDeCola,
  type Vista,
  type VistaDePaquete,
} from './packages.ts';
import { leerEstado, guardarEstado } from './store.ts';
import { estadoHumanoVacio, type Ediciones, type EstadoHumano } from './state.ts';
import { aprobar, editar, marcarQA, reabrir, rechazar, TransicionInvalida, type ContextoEfectivo } from './actions.ts';
import type { QAResult } from './schemas.ts';

/**
 * El punto de unión: junta la lectura de ficheros (`packages.ts`), el estado
 * humano (`store.ts`) y las reglas de transición (`actions.ts`). Es lo único
 * que llaman las rutas de la API — ellas no hablan con Supabase ni con el
 * sistema de ficheros directamente.
 */

export { TransicionInvalida };

/** Toda la cola, fusionada y ordenada. Un paquete roto no tira a los demás. */
export async function obtenerCola(credencial: Credencial): Promise<Vista[]> {
  const rutas = await listarRutasDePaquetes();
  const vistas = await Promise.all(
    rutas.map(async ({ fecha, id, ruta }) => {
      const [crudo, humano] = await Promise.all([
        leerPaquete(fecha, id, ruta),
        leerEstado(credencial, id).catch(() => null),
      ]);
      return fusionarPaquete(crudo, humano);
    }),
  );
  return ordenDeCola(vistas);
}

/** Una sola pieza. `null` si no existe ningún fichero con ese id. */
export async function obtenerPaquete(credencial: Credencial, id: string): Promise<Vista | null> {
  const rutas = await listarRutasDePaquetes();
  const encontrada = rutas.find((r) => r.id === id);
  if (!encontrada) return null;

  const [crudo, humano] = await Promise.all([
    leerPaquete(encontrada.fecha, encontrada.id, encontrada.ruta),
    leerEstado(credencial, id).catch(() => null),
  ]);
  return fusionarPaquete(crudo, humano);
}

function contexto(vista: VistaDePaquete): ContextoEfectivo {
  return { status: vista.status, qa: vista.qa, needsReReview: vista.needsReReview };
}

async function estadoActualO(credencial: Credencial, vista: VistaDePaquete): Promise<EstadoHumano> {
  const guardado = await leerEstado(credencial, vista.id);
  return guardado ?? estadoHumanoVacio(vista.id, new Date().toISOString());
}

/**
 * Cada acción sigue el mismo camino: cargar la pieza, comprobar que no está
 * bloqueada, aplicar la regla de `actions.ts` (que puede lanzar
 * `TransicionInvalida`), y guardar. Ninguna de estas funciones publica nada
 * ni toca el fichero de origen.
 */
async function ejecutar(
  credencial: Credencial,
  id: string,
  aplicar: (actual: EstadoHumano, ctx: ContextoEfectivo, ahora: string) => EstadoHumano,
): Promise<VistaDePaquete> {
  const vista = await obtenerPaquete(credencial, id);
  if (!vista) throw new TransicionInvalida(`No existe ningún paquete con id ${id}.`);
  if (vista.blocked) throw new TransicionInvalida(`«${id}» está bloqueado: ${vista.error}`);

  const actual = await estadoActualO(credencial, vista);
  const ahora = new Date().toISOString();
  const siguiente = aplicar(actual, contexto(vista), ahora);

  await guardarEstado(credencial, siguiente);

  const releido = await obtenerPaquete(credencial, id);
  if (!releido || releido.blocked) throw new TransicionInvalida('El paquete ha dejado de ser legible tras guardar.');
  return releido;
}

export function aprobarPaquete(credencial: Credencial, id: string, actor: string): Promise<VistaDePaquete> {
  return ejecutar(credencial, id, (actual, ctx, ahora) => aprobar(actual, ctx, actor, ahora));
}

export function rechazarPaquete(credencial: Credencial, id: string, motivo: string, actor: string): Promise<VistaDePaquete> {
  return ejecutar(credencial, id, (actual, ctx, ahora) => rechazar(actual, ctx, motivo, actor, ahora));
}

export function editarPaquete(credencial: Credencial, id: string, cambios: Ediciones, actor: string): Promise<VistaDePaquete> {
  return ejecutar(credencial, id, (actual, ctx, ahora) => editar(actual, ctx, cambios, actor, ahora));
}

export function marcarQADePaquete(credencial: Credencial, id: string, resultado: QAResult, actor: string): Promise<VistaDePaquete> {
  return ejecutar(credencial, id, (actual, ctx, ahora) => marcarQA(actual, ctx, resultado, actor, ahora));
}

export function reabrirPaquete(credencial: Credencial, id: string, actor: string): Promise<VistaDePaquete> {
  return ejecutar(credencial, id, (actual, ctx, ahora) => reabrir(actual, ctx, actor, ahora));
}
