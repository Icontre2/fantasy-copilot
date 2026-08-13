import { errorJson, privateJson } from '@/src/server/http/responses';
import { requireSession } from '@/src/server/http/session-guard';
import { getLeagueMarket } from '@/src/server/laliga/read';
import { cancelBid, makeBid, modifyBid } from '@/src/server/laliga/writes';

export const dynamic = 'force-dynamic';

type Body = { action?: unknown; amount?: unknown; expectedBidId?: unknown; expectedBidAmount?: unknown };
const locks = ((globalThis as { __fantasyBidLocks?: Map<string, Promise<void>> }).__fantasyBidLocks ??= new Map());

async function locked<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  locks.set(key, queued);
  await previous;
  try { return await task(); } finally { release(); if (locks.get(key) === queued) locks.delete(key); }
}

export async function POST(request: Request, { params }: { params: Promise<{ leagueId: string; marketId: string }> }) {
  const auth = await requireSession(request);
  if ('response' in auth) return auth.response;
  const { leagueId, marketId } = await params;
  let body: Body;
  try { body = await request.json(); } catch { return privateJson({ error: 'Petición no válida.' }, 400); }
  if (!['create', 'modify', 'cancel'].includes(String(body.action))) return privateJson({ error: 'Acción de puja no válida.' }, 400);
  const amount = Number(body.amount);
  if (body.action !== 'cancel' && (!Number.isSafeInteger(amount) || amount <= 0)) {
    return privateJson({ error: 'La puja debe ser un importe entero mayor que cero.' }, 400);
  }

  try {
    return await locked(`${leagueId}:${marketId}`, async () => {
      const before = (await getLeagueMarket(auth.token, leagueId)).find((entry) => entry.marketId === marketId);
      if (!before) return privateJson({ error: 'El jugador ya no está en el mercado.' }, 409);
      const expectedBidId = typeof body.expectedBidId === 'string' ? body.expectedBidId : undefined;
      const expectedAmount = Number(body.expectedBidAmount);
      if (expectedBidId !== before.myBid?.bidId || (expectedBidId && expectedAmount !== before.myBid?.amount)) {
        return privateJson({ error: 'Tu puja cambió desde que abriste la pantalla. Actualiza antes de continuar.' }, 409);
      }
      if (body.action === 'create') {
        if (before.myBid) return privateJson({ error: 'Ya existe una puja; actualiza el mercado.' }, 409);
        await makeBid(auth.token, leagueId, marketId, amount);
      } else if (body.action === 'modify') {
        if (!before.myBid) return privateJson({ error: 'La puja ya no existe.' }, 409);
        await modifyBid(auth.token, leagueId, marketId, before.myBid.bidId, amount);
      } else {
        if (!before.myBid) return privateJson({ error: 'La puja ya estaba cancelada.' }, 409);
        await cancelBid(auth.token, leagueId, marketId, before.myBid.bidId);
      }
      const after = (await getLeagueMarket(auth.token, leagueId)).find((entry) => entry.marketId === marketId);
      const confirmed = body.action === 'cancel' ? !after?.myBid : after?.myBid?.amount === amount;
      return privateJson({ confirmed, marketEntry: after ?? null }, confirmed ? 200 : 202);
    });
  } catch (error) { return errorJson(error); }
}
