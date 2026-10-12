import { requireSession } from '@/src/server/http/session-guard';
import { privateJson, errorJson } from '@/src/server/http/responses';
import { readSessionId } from '@/src/server/laliga/session-cookie';
import { hasPersistentStorage } from '@/src/server/laliga/session';
import { readClauseChanges } from '@/src/server/laliga/clause-history';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ('response' in auth) return auth.response;
  if (!hasPersistentStorage()) {
    return privateJson({ changes: [], available: false, message: 'El histórico requiere almacenamiento persistente.' });
  }
  const sessionId = readSessionId(request);
  if (!sessionId) return privateJson({ error: 'No se encontró la sesión.' }, 401);

  try {
    const { leagueId } = await params;
    const changes = await readClauseChanges(sessionId, leagueId, 100);
    return privateJson({ changes, available: true });
  } catch (error) {
    return errorJson(error);
  }
}
