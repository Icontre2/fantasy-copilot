import { getPlayerCatalog } from '@/src/server/laliga/read';
import type { Player } from '@/src/domain/fantasy';
import { FALLBACK_TEAMS } from '@/src/server/laliga/teams';
import { matchExternalPlayer } from './match';
import { FUTBOLFANTASY_TEAM_SLUGS } from './teams';
import { parseProbableLineup, type ProbableLineupEntry } from './parser';

export type { ProbableLineupEntry } from './parser';

export type ProbableTeam = {
  teamId: string;
  name: string;
  shortName: string;
  badge: string;
  players: Array<ProbableLineupEntry & { playerId?: string; image?: string; player?: Player }>;
};

const BASE = 'https://www.futbolfantasy.com/laliga/equipos/';
const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; LigaLab/2.0; +personal use)' };

async function fetchTeam(slug: string): Promise<string> {
  const response = await fetch(`${BASE}${slug}`, {
    headers,
    next: { revalidate: 60 * 60 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`FútbolFantasy respondió ${response.status} para ${slug}.`);
  return response.text();
}

async function mapConcurrent<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      if (item !== undefined) output[index] = await worker(item);
    }
  }));
  return output;
}

export async function getProbableTeam(
  teamId: string,
  catalog: Awaited<ReturnType<typeof getPlayerCatalog>>,
): Promise<ProbableTeam> {
  const slug = FUTBOLFANTASY_TEAM_SLUGS[teamId];
  if (!slug) throw new Error(`FútbolFantasy no tiene slug para el equipo ${teamId}.`);
  const entries = parseProbableLineup(await fetchTeam(slug));
  const teamPlayers = catalog.filter((player) => player.teamId === teamId);
  return {
    teamId,
    name: FALLBACK_TEAMS[teamId]?.name ?? slug,
    shortName: FALLBACK_TEAMS[teamId]?.shortName ?? slug.slice(0, 3).toUpperCase(),
    badge: FALLBACK_TEAMS[teamId]?.badge ?? '',
    players: entries.map((entry) => {
      const matched = teamPlayers.find(
        (player) => matchExternalPlayer(entries, player.name)?.externalId === entry.externalId,
      );
      return { ...entry, playerId: matched?.id, image: matched?.image, player: matched };
    }),
  };
}

export async function getProbableLineups(): Promise<{
  teams: ProbableTeam[];
  updatedAt: string;
  source: string;
  failedTeams: number;
}> {
  const catalog = await getPlayerCatalog();
  const catalogByTeam = new Map<string, typeof catalog>();
  for (const player of catalog) {
    if (!player.teamId) continue;
    const list = catalogByTeam.get(player.teamId) ?? [];
    list.push(player);
    catalogByTeam.set(player.teamId, list);
  }

  const definitions = Object.entries(FUTBOLFANTASY_TEAM_SLUGS);
  const settled = await mapConcurrent(definitions, 5, async ([teamId]) => {
    try {
      return {
        ok: true as const,
        team: await getProbableTeam(teamId, catalogByTeam.get(teamId) ?? []),
      };
    } catch {
      return { ok: false as const };
    }
  });

  const teams = settled.flatMap((result) => result.ok ? [result.team] : []);
  if (!teams.length) throw new Error('FútbolFantasy no publicó alineaciones interpretables en este momento.');
  return {
    teams: teams.sort((a, b) => a.name.localeCompare(b.name, 'es')),
    failedTeams: settled.length - teams.length,
    updatedAt: new Date().toISOString(),
    source: 'https://www.futbolfantasy.com/laliga/posibles-alineaciones',
  };
}
