import type { ActivityEntry } from './economy/activity.ts';

const MAX_ACTIVITY_PAGES = 100;

export type ActivityPageReport = {
  index: number;
  count: number;
  added: number;
  oldest: string | null;
  newest: string | null;
};

/**
 * Recorre el historial paginado y elimina solapes entre paginas.
 *
 * La API NO pagina con `?limit=` ni `?page=`: el indice forma parte de la ruta
 * (`/activity/0`, `/activity/1`, ...). La ruta sin indice solo devuelve el
 * tramo reciente. Se para al recibir una pagina vacia. El segundo corte evita
 * un bucle infinito si el upstream ignorase el indice y repitiese una pagina.
 */
export async function collectActivityPages(
  fetchPage: (index: number) => Promise<ActivityEntry[]>,
  onPage?: (report: ActivityPageReport) => void,
): Promise<ActivityEntry[]> {
  const result: ActivityEntry[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < MAX_ACTIVITY_PAGES; index += 1) {
    const page = await fetchPage(index);
    if (page.length === 0) {
      onPage?.({ index, count: 0, added: 0, oldest: null, newest: null });
      return result;
    }

    let added = 0;
    for (const entry of page) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      result.push(entry);
      added += 1;
    }
    const dates = page.map((entry) => entry.createdAt).sort();
    onPage?.({
      index,
      count: page.length,
      added,
      oldest: dates[0] ?? null,
      newest: dates.at(-1) ?? null,
    });
    if (added === 0) return result;
  }

  throw new Error(`El historial de actividad supera ${MAX_ACTIVITY_PAGES} paginas; no se devuelve una caja truncada.`);
}
