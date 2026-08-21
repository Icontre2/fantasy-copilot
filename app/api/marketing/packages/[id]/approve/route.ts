import { privateJson } from "@/src/server/http/responses";
import { autorizar, esRespuestaDeError, errorDeMarketing } from "@/src/server/marketing/http";
import { aprobarPaquete } from "@/src/server/marketing/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketing/packages/[id]/approve — fase 4, APROBAR.
 *
 * Solo cambia el estado guardado en Supabase a `approved`. No genera nada, no
 * llama a ningún proveedor externo, no publica en ninguna red: eso es
 * exactamente lo que NO autoriza este sprint, y aquí no hay ningún camino que
 * lo haga.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await autorizar(request);
  if (esRespuestaDeError(quien)) return quien;

  const { id } = await params;
  try {
    const paquete = await aprobarPaquete(quien.credencial, id, quien.email);
    return privateJson({ package: paquete });
  } catch (error) {
    return errorDeMarketing(error);
  }
}
