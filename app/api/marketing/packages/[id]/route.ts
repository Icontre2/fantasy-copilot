import { privateJson } from "@/src/server/http/responses";
import { autorizar, esRespuestaDeError, errorDeMarketing } from "@/src/server/marketing/http";
import { obtenerPaquete } from "@/src/server/marketing/service";

export const dynamic = "force-dynamic";

/** GET /api/marketing/packages/[id] — la ficha de creativo completa (fase 3). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await autorizar(request);
  if (esRespuestaDeError(quien)) return quien;

  const { id } = await params;
  try {
    const paquete = await obtenerPaquete(quien.credencial, id);
    if (!paquete) return privateJson({ error: `No existe ningún paquete con id ${id}.` }, 404);
    return privateJson({ package: paquete });
  } catch (error) {
    return errorDeMarketing(error);
  }
}
