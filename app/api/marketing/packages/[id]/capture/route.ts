import { z } from "zod";
import { privateJson } from "@/src/server/http/responses";
import { autorizar, esRespuestaDeError, errorDeMarketing, responder } from "@/src/server/marketing/http";
import { adjuntarCapturaAPaquete } from "@/src/server/marketing/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketing/packages/[id]/capture — fase 5, adjuntar una captura real.
 *
 * `addedAt` NO se acepta del cliente: lo pone el servidor (ver
 * `adjuntarCaptura`). Un historial cuya fecha puede fijar quien llama no
 * sirve como historial.
 *
 * Esto no sube ningún fichero: guarda de qué pantalla es y dónde está. El
 * almacenamiento externo es otra fase; esto es lo que hacía falta para no
 * perder la pista de una captura que ya existe.
 */
const cuerpoSchema = z.object({
  type: z.string(),
  file: z.string(),
  description: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await autorizar(request);
  if (esRespuestaDeError(quien)) return quien;

  const cuerpo = cuerpoSchema.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return privateJson({ error: "Hacen falta al menos la pantalla y la URL o ruta de la captura." }, 400);
  }

  const { id } = await params;
  try {
    const paquete = await adjuntarCapturaAPaquete(
      quien.credencial,
      id,
      { ...cuerpo.data, addedAt: new Date().toISOString() },
      quien.email,
    );
    return responder({ package: paquete }, quien.cookies);
  } catch (error) {
    return errorDeMarketing(error);
  }
}
