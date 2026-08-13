import { errorJson, privateJson } from '@/src/server/http/responses';
import { requireSession } from '@/src/server/http/session-guard';
import { getMarketValueHistory } from '@/src/server/laliga/read';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ playerId: string }> }) {
  const auth = await requireSession(request);
  if ('response' in auth) return auth.response;
  const { playerId } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(playerId)) return privateJson({ error: 'Jugador no válido.' }, 400);
  try { return privateJson({ history: await getMarketValueHistory(playerId) }); }
  catch (error) { return errorJson(error); }
}
