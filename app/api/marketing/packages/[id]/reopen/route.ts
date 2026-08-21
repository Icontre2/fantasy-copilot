import { privateJson } from "@/src/server/http/responses";
import { autorizar, esRespuestaDeError, errorDeMarketing } from "@/src/server/marketing/http";
import { reabrirPaquete } from "@/src/server/marketing/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketing/packages/[id]/reopen — la única forma de volver a
 * tocar una pieza ya `approved` o `rejected`. Exige QA otra vez antes de
 * poder aprobarse de nuevo (ver `reabrir` en `actions.ts`).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await autorizar(request);
  if (esRespuestaDeError(quien)) return quien;

  const { id } = await params;
  try {
    const paquete = await reabrirPaquete(quien.credencial, id, quien.email);
    return privateJson({ package: paquete });
  } catch (error) {
    return errorDeMarketing(error);
  }
}
