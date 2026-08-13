import { errorJson, privateJson } from '@/src/server/http/responses';
import { requireSession } from '@/src/server/http/session-guard';
import { buildDashboard } from '@/src/server/laliga/dashboard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ('response' in auth) return auth.response;
  const { leagueId } = await params;
  try {
    return privateJson(await buildDashboard(auth.token, leagueId));
  } catch (error) {
    return errorJson(error);
  }
}
