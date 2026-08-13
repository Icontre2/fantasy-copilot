import { errorJson, privateJson } from '@/src/server/http/responses';
import { requireSession } from '@/src/server/http/session-guard';
import { getProbableLineups } from '@/src/server/futbolfantasy/lineups';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const auth = await requireSession(request); if ('response' in auth) return auth.response;
  try { return privateJson(await getProbableLineups()); } catch (error) { return errorJson(error); }
}
