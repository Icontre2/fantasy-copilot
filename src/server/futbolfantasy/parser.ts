import { load } from 'cheerio';

export type ProbableLineupEntry = {
  externalId: string;
  name: string;
  position: string;
  /** Porcentaje publicado por FútbolFantasy cuando existe. */
  probability?: number;
  /** Señal cualitativa publicada cuando la página marca un once, pero no porcentajes. */
  expectedStarter?: boolean;
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

  /*
   * Girona, Mallorca y Oviedo publican un once completo con
   * `data-onceFF="titular"`, pero todavía no publican porcentajes. Antes estos
   * 33 jugadores se descartaban porque el selector exigía `tipo_campo` y
   * `data-probabilidad`. Recuperamos la señal cualitativa sin convertirla en un
   * porcentaje inventado.
   */
  if (!seen.size) {
    $('[class*="jugador_"][data-onceFF="titular"]').each((_, element) => {
      const node = $(element);
      const externalId = (node.attr('class') ?? '').match(/jugador_(\d+)/)?.[1];
      if (!externalId || seen.has(externalId)) return;
      const name = node.find('.truncate-name').first().text().trim()
        || node.find('img[alt]').first().attr('alt')?.trim()
        || '';
      if (!name) return;
      seen.set(externalId, {
        externalId,
        name,
        position: node.attr('data-posicion') ?? '',
        expectedStarter: true,
      });
    });
  }
  if (!seen.size) throw new Error('FútbolFantasy cambió el formato de sus alineaciones.');
  return [...seen.values()].sort((a, b) => (b.probability ?? -1) - (a.probability ?? -1));
}
