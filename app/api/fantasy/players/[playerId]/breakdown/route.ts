import { errorJson, privateJson } from '@/src/server/http/responses';
import { requireSession } from '@/src/server/http/session-guard';
import { getPlayerBreakdown, getPlayerCatalog } from '@/src/server/laliga/read';
import { rentabilidad } from '@/src/server/laliga/value-ratio';

export const dynamic = 'force-dynamic';

/**
 * GET /api/fantasy/players/{id}/breakdown
 *
 * Desglose oficial de puntos + puntos por millón (cálculo nuestro). Si el
 * catálogo falla, el desglose se devuelve igual y la rentabilidad va a `null`:
 * es un añadido, no una condición.
 */
export async function GET(request: Request, { params }: { params: Promise<{ playerId: string }> }) {
  const auth = await requireSession(request);
  if ('response' in auth) return auth.response;
  const { playerId } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(playerId)) return privateJson({ error: 'Jugador no válido.' }, 400);
  try {
    const [desglose, catalogo] = await Promise.all([
      getPlayerBreakdown(playerId),
      getPlayerCatalog().catch(() => null),
    ]);
    return privateJson({
      desglose,
      rentabilidad: catalogo ? rentabilidad(playerId, catalogo) : null,
    });
  } catch (error) {
    return errorJson(error);
  }
}
