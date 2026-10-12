import { getValidAccessToken } from '@/src/server/laliga/session';
import { getMyLeagues, getLeagueSnapshot } from '@/src/server/laliga/read';
import { captureClauseSnapshot } from '@/src/server/laliga/clause-history';
import { hasPersistentStorage } from '@/src/server/laliga/session';
import { sesionesActivas } from '@/src/server/alerts/push-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Captura diaria protegida: nunca acepta tokens de LALIGA desde el cliente. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return Response.json({ error: 'CRON_SECRET no está configurado.' }, { status: 501 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!hasPersistentStorage()) {
    return Response.json({ error: 'El histórico diario requiere sesiones persistentes en Supabase.' }, { status: 501 });
  }

  const sessionIds = await sesionesActivas();
  const results: Array<Record<string, unknown>> = [];
  for (const sessionId of sessionIds) {
    const token = await getValidAccessToken(sessionId);
    if (!token) {
      results.push({ sessionId, status: 'SESSION_EXPIRED' });
      continue;
    }
    try {
      const leagues = await getMyLeagues(token);
      for (const league of leagues) {
        try {
          const snapshot = await getLeagueSnapshot(token, league.id);
          if (snapshot.failedTeamIds.length > 0) {
            results.push({ sessionId, leagueId: league.id, status: 'INCOMPLETE', failedTeams: snapshot.failedTeamIds.length });
            continue;
          }
          const captured = await captureClauseSnapshot(sessionId, league.id, snapshot.teams);
          results.push({
            sessionId,
            leagueId: league.id,
            status: 'OK',
            capturedAt: captured.capturedAt,
            playersCaptured: captured.playersCaptured,
            clauseChanges: captured.changes.length,
            increases: captured.changes.filter((change) => change.eventType === 'INCREASE').length,
          });
        } catch (error) {
          results.push({ sessionId, leagueId: league.id, status: 'ERROR', error: error instanceof Error ? error.message : String(error) });
        }
      }
    } catch (error) {
      results.push({ sessionId, status: 'ERROR', error: error instanceof Error ? error.message : String(error) });
    }
  }

  return Response.json({
    sessions: sessionIds.length,
    capturedLeagues: results.filter((result) => result.status === 'OK').length,
    totalClauseChanges: results.reduce((total, result) => total + (typeof result.clauseChanges === 'number' ? result.clauseChanges : 0), 0),
    results,
  });
}
