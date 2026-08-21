import { z } from "zod";
import { privateJson } from "@/src/server/http/responses";
import { autorizar, esRespuestaDeError, errorDeMarketing } from "@/src/server/marketing/http";
import { rechazarPaquete } from "@/src/server/marketing/service";

export const dynamic = "force-dynamic";

const cuerpoSchema = z.object({ reason: z.string() });

/** POST /api/marketing/packages/[id]/reject — fase 4, RECHAZAR. El motivo es obligatorio. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await autorizar(request);
  if (esRespuestaDeError(quien)) return quien;

  const cuerpo = cuerpoSchema.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return privateJson({ error: "Falta el motivo del rechazo." }, 400);
  }

  const { id } = await params;
  try {
    const paquete = await rechazarPaquete(quien.credencial, id, cuerpo.data.reason, quien.email);
    return privateJson({ package: paquete });
  } catch (error) {
    return errorDeMarketing(error);
  }
}
