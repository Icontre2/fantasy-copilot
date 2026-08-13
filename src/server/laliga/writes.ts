import { COMPETITION_ID, DEFAULT_HEADERS, LALIGA_PRIVATE_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { LaligaError } from './errors';

type Method = 'POST' | 'PUT' | 'DELETE';

async function mutate(path: string, accessToken: string, method: Method, body?: unknown): Promise<void> {
  const url = new URL(path, LALIGA_PRIVATE_BASE_URL);
  url.searchParams.set('x-lang', 'es');
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        ...DEFAULT_HEADERS,
        Authorization: `Bearer ${accessToken}`,
        'x-lang': 'es',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === 'TimeoutError';
    throw new LaligaError(timeout ? 'timeout' : 'network', 'No se pudo confirmar la operación con LALIGA.', path);
  }
  if (response.status === 401 || response.status === 403) {
    throw new LaligaError('unauthorized', 'La sesión de LALIGA no es válida.', path, response.status);
  }
  if (response.status === 404) throw new LaligaError('not_found', 'La puja o el jugador ya no están disponibles.', path, 404);
  if (!response.ok) throw new LaligaError('upstream', `LALIGA rechazó la operación (${response.status}).`, path, response.status);
}

const marketPath = (leagueId: string, marketId: string) =>
  `/api/v1/competition/${COMPETITION_ID}/league/${encodeURIComponent(leagueId)}/market/${encodeURIComponent(marketId)}`;

export function makeBid(token: string, leagueId: string, marketId: string, amount: number) {
  return mutate(`${marketPath(leagueId, marketId)}/bid`, token, 'POST', { money: amount });
}

export function modifyBid(token: string, leagueId: string, marketId: string, bidId: string, amount: number) {
  return mutate(`${marketPath(leagueId, marketId)}/bid/${encodeURIComponent(bidId)}`, token, 'PUT', { money: amount });
}

export function cancelBid(token: string, leagueId: string, marketId: string, bidId: string) {
  return mutate(`${marketPath(leagueId, marketId)}/bid/${encodeURIComponent(bidId)}/cancel`, token, 'DELETE');
}
