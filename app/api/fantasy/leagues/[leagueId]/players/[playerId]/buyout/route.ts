import { errorJson, privateJson } from '@/src/server/http/responses';
import { requireSession } from '@/src/server/http/session-guard';
import { getLeagueSnapshot, getMyProfile } from '@/src/server/laliga/read';
import { payBuyoutClause } from '@/src/server/laliga/writes';
import { isClauseShielded } from '@/src/server/laliga/alerts/clause-alerts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Body = { expectedClause?: unknown; expectedOwnerId?: unknown };
const locks = ((globalThis as { __fantasyBuyoutLocks?: Map<string, Promise<void>> }).__fantasyBuyoutLocks ??= new Map());

async function locked<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  locks.set(key, queued);
  await previous;
  try { return await task(); } finally { release(); if (locks.get(key) === queued) locks.delete(key); }
}

export async function POST(request: Request, { params }: { params: Promise<{ leagueId: string; playerId: string }> }) {
  const auth = await requireSession(request);
  if ('response' in auth) return auth.response;
  const { leagueId, playerId } = await params;
  let body: Body;
  try { body = await request.json(); } catch { return privateJson({ error: 'Petición no válida.' }, 400); }
  const expectedClause = Number(body.expectedClause);
  if (!Number.isSafeInteger(expectedClause) || expectedClause <= 0 || typeof body.expectedOwnerId !== 'string') {
    return privateJson({ error: 'Faltan la cláusula o el propietario que viste en pantalla.' }, 400);
  }

  try {
    return await locked(`${leagueId}:${playerId}`, async () => {
      const [before, profile] = await Promise.all([getLeagueSnapshot(auth.token, leagueId), getMyProfile(auth.token)]);
      const owner = before.teams.find((team) => team.players.some((player) => player.id === playerId));
      const player = owner?.players.find((candidate) => candidate.id === playerId);
      const mine = before.teams.find((team) => team.manager.id === profile.id);
      if (!owner || !player) return privateJson({ error: 'El jugador ya no pertenece a ese equipo.' }, 409);
      if (owner.manager.id !== body.expectedOwnerId || player.buyoutClause !== expectedClause) {
        return privateJson({ error: 'La cláusula o el propietario han cambiado. Actualiza antes de continuar.' }, 409);
      }
      if (owner.manager.id === profile.id) return privateJson({ error: 'No puedes pagar la cláusula de un jugador propio.' }, 409);
      if (isClauseShielded(player)) {
        const until = player.shieldedUntil
          ? new Date(player.shieldedUntil).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : null;
        return privateJson({ error: until ? `La cláusula está bloqueada hasta el ${until}.` : 'La cláusula está bloqueada ahora mismo.' }, 409);
      }
      if (mine?.teamMoney !== undefined && mine.teamMoney < expectedClause) {
        return privateJson({ error: 'No tienes caja suficiente para pagar esta cláusula.' }, 409);
      }

      await payBuyoutClause(auth.token, leagueId, playerId, expectedClause);
      const after = await getLeagueSnapshot(auth.token, leagueId);
      const confirmed = after.teams.some((team) => team.manager.id === profile.id && team.players.some((candidate) => candidate.id === playerId));
      return privateJson({ confirmed }, confirmed ? 200 : 202);
    });
  } catch (error) { return errorJson(error); }
}
