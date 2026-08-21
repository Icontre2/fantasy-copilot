import { privateJson } from "@/src/server/http/responses";
import { autorizar, esRespuestaDeError, errorDeMarketing } from "@/src/server/marketing/http";
import { obtenerCola } from "@/src/server/marketing/service";

export const dynamic = "force-dynamic";

/** GET /api/marketing/queue — la cola completa, ya ordenada (fase 2). */
export async function GET(request: Request) {
  const quien = await autorizar(request);
  if (esRespuestaDeError(quien)) return quien;

  try {
    const cola = await obtenerCola(quien.credencial);
    return privateJson({ queue: cola });
  } catch (error) {
    return errorDeMarketing(error);
  }
}
