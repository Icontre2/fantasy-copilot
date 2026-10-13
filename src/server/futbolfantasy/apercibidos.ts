import { load } from 'cheerio';

/**
 * Apercibidos de LaLiga: jugadores a una amarilla de cumplir sanción.
 *
 * LALIGA no publica las tarjetas acumuladas en su API; FútbolFantasy sí, en
 * una página con un bloque por equipo y, dentro, cada jugador con las jornadas
 * en que vio amarilla. Se lee solo eso —dato factual—, no texto suyo.
 */

export type Apercibido = {
  name: string;
  /** Slug del equipo en FútbolFantasy (`celta`, `real-madrid`…). */
  teamSlug: string;
  /** Jornadas en que vio amarilla en el ciclo actual. */
  jornadas: number[];
};

export function parseApercibidos(html: string): Apercibido[] {
  const $ = load(html);
  const salida: Apercibido[] = [];
  $('.disciplinary-cards').each((_, bloque) => {
    const enlaceEquipo = $(bloque).find('header a[href*="/equipos/"]').first().attr('href') ?? '';
    const teamSlug = enlaceEquipo.split('/equipos/')[1]?.replace(/\/.*$/, '') ?? '';
    if (!teamSlug) return;
    $(bloque).find('.elemento').each((__, el) => {
      const name = $(el).find('a.jugador').first().text().trim();
      if (!name) return;
      const jornadas = $(el).find('.tarjetasA .jornadaT').map((___, j) => Number($(j).text().replace(/\D/g, ''))).get().filter((n: number) => Number.isFinite(n) && n > 0).sort((a: number, b: number) => a - b);
      salida.push({ name, teamSlug, jornadas });
    });
  });
  return salida;
}

export async function getApercibidos(): Promise<Apercibido[]> {
  const response = await fetch('https://www.futbolfantasy.com/laliga/apercibidos', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LigaLab/2.0; +personal use)' },
    next: { revalidate: 3 * 60 * 60 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`FútbolFantasy respondió ${response.status} en apercibidos.`);
  return parseApercibidos(await response.text());
}
