import { load } from 'cheerio';

export type ProbableMatch = { home: string; away: string; kickoff?: string; url: string; homePlayers: string[]; awayPlayers: string[] };
const INDEX = 'https://www.futbolfantasy.com/laliga/posibles-alineaciones';
const headers = { Accept: 'text/html', 'User-Agent': 'FantasyCopilot/2.0 (+personal-use)' };
const MATCH_LINK = /^https:\/\/www\.futbolfantasy\.com\/partidos\/[a-zA-Z0-9_-]+$/;

async function html(url: string): Promise<string> {
  const response = await fetch(url, { headers, next: { revalidate: 600 }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`FútbolFantasy respondió ${response.status}.`);
  return response.text();
}

export function parseMatchPage(source: string, url: string): ProbableMatch {
  const $ = load(source);
  const title = $('.alineacion_wrapper header.title').first().text().replace(/\s+/g, ' ').trim().replace(/^Posibles alineaciones\s+/i, '');
  const [home = 'Local', away = 'Visitante'] = title.split(/\s+-\s+/);
  const players = (side: string) => $(`.campo-wrapper.${side} .camiseta-wrapper`).map((_, element) => $(element).find('.fotocontainer img[alt]').first().attr('alt')?.trim()).get().filter(Boolean).slice(0, 11);
  return { home, away, url, homePlayers: players('local'), awayPlayers: players('visitante') };
}

export async function getProbableLineups(): Promise<{ matches: ProbableMatch[]; updatedAt: string; source: string }> {
  const $ = load(await html(INDEX));
  const links = $('a.partido[href*="/partidos/"]').map((_, element) => ({
    url: $(element).attr('href')!, kickoff: $(element).find('.fecha').text().replace(/\s+/g, ' ').trim(),
  })).get().filter((item) => MATCH_LINK.test(item.url)).filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index).slice(0, 10);
  const settled = await Promise.allSettled(links.map(async (link) => ({ ...parseMatchPage(await html(link.url), link.url), kickoff: link.kickoff })));
  const matches = settled.flatMap((result) => result.status === 'fulfilled' && result.value.homePlayers.length === 11 && result.value.awayPlayers.length === 11 ? [result.value] : []);
  if (!matches.length) throw new Error('FútbolFantasy no publicó onces interpretables en este momento.');
  return { matches, updatedAt: new Date().toISOString(), source: INDEX };
}
