import type { ProbableLineupEntry } from './lineups';

export function normalizePlayerName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function words(name: string): string[] {
  return normalizePlayerName(name).split(' ').filter((word) => word.length >= 3);
}

export function matchExternalPlayer(entries: ProbableLineupEntry[], name: string): ProbableLineupEntry | undefined {
  const normalized = normalizePlayerName(name);
  const exact = entries.find((entry) => normalizePlayerName(entry.name) === normalized);
  if (exact) return exact;
  for (const word of words(name)) {
    const candidates = entries.filter((entry) => words(entry.name).includes(word));
    if (candidates.length === 1) return candidates[0];
  }
  return undefined;
}
