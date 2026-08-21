import { privateJson } from "@/src/server/http/responses";
import { autorizar, esRespuestaDeError, errorDeMarketing } from "@/src/server/marketing/http";
import { marcarQADePaquete } from "@/src/server/marketing/service";
import { qaResultSchema } from "@/src/server/marketing/schemas";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketing/packages/[id]/qa — registrar un control de calidad.
 *
 * `agents/brand-reviewer.md` es hoy un prompt, no un agente que corra dentro
 * de esta app: quien marca `pass`/`blockedReasons` es una persona leyendo esa
 * pauta, no un proceso automático. `checkedAt`/`checkedBy` los pone el
 * servidor siempre, aunque el cliente los mande — así el audit trail nunca
 * puede llevar una fecha o un autor inventados.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const quien = await autorizar(request);
  if (esRespuestaDeError(quien)) return quien;

  const cuerpo = qaResultSchema.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return privateJson({ error: "El resultado de QA enviado no tiene una forma válida." }, 400);
  }

  const { id } = await params;
  try {
    const paquete = await marcarQADePaquete(quien.credencial, id, cuerpo.data, quien.email);
    return privateJson({ package: paquete });
  } catch (error) {
    return errorDeMarketing(error);
  }
}
