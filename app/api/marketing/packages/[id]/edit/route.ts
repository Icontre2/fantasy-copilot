import { privateJson } from "@/src/server/http/responses";
import { autorizar, esRespuestaDeError, errorDeMarketing, responder } from "@/src/server/marketing/http";
import { editarPaquete } from "@/src/server/marketing/service";
import { edicionesSchema } from "@/src/server/marketing/state";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketing/packages/[id]/edit — fase 4, EDITAR.
 *
 * `edicionesSchema` es, a propósito, el único contenido que esta ruta puede
 * cambiar: hook, script, captions, CTA. No hay ningún campo aquí para las
 * fuentes, el score del Radar, la feature de origen o el historial de QA —
 * ni siquiera se pueden mandar por error, porque el schema no los admite.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await autorizar(request);
  if (esRespuestaDeError(quien)) return quien;

  const cuerpo = edicionesSchema.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return privateJson({ error: "El cambio enviado no tiene una forma válida." }, 400);
  }

  const { id } = await params;
  try {
    const paquete = await editarPaquete(quien.credencial, id, cuerpo.data, quien.email);
    return responder({ package: paquete }, quien.cookies);
  } catch (error) {
    return errorDeMarketing(error);
  }
}
