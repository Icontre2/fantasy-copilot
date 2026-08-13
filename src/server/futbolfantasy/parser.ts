import { load } from 'cheerio';

export type ProbableLineupEntry = {
  externalId: string;
  name: string;
  position: string;
  probability: number;
};

export function parseProbableLineup(source: string): ProbableLineupEntry[] {
  const $ = load(source);
  const seen = new Map<string, ProbableLineupEntry>();
  $('[class*="jugador_"][class*="tipo_campo"]').each((_, element) => {
    const node = $(element);
    const externalId = (node.attr('class') ?? '').match(/jugador_(\d+)/)?.[1];
    if (!externalId || seen.has(externalId)) return;
    const shirt = node.find('a.camiseta').first();
    const probability = Number.parseInt(shirt.attr('data-probabilidad') ?? '', 10);
    const name = node.find('.truncate-name').first().text().trim();
    if (!name || Number.isNaN(probability)) return;
    seen.set(externalId, {
      externalId,
      name,
      position: node.attr('data-posicion') ?? shirt.attr('data-posicion') ?? '',
      probability,
    });
  });
  if (!seen.size) throw new Error('FútbolFantasy cambió el formato de sus alineaciones.');
  return [...seen.values()].sort((a, b) => b.probability - a.probability);
}
