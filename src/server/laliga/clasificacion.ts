import type { Team } from '@/src/domain/fantasy';
import type { Match } from './calendar.ts';

/**
 * Clasificación de LaLiga calculada con los resultados oficiales del
 * calendario: 3 puntos por victoria, 1 por empate. Desempate: puntos,
 * diferencia de goles, goles a favor (el oficial usa antes el enfrentamiento
 * directo; se dice en pantalla).
 */

export type FilaClasificacion = {
  team: Team;
  pj: number; g: number; e: number; p: number;
  gf: number; gc: number; dg: number; pts: number;
  /** Últimos 5 resultados, del más antiguo al más reciente. */
  racha: Array<'G' | 'E' | 'P'>;
};

export function calcularClasificacion(partidos: Match[]): FilaClasificacion[] {
  const filas = new Map<string, FilaClasificacion & { _historial: Array<{ k: string; r: 'G' | 'E' | 'P' }> }>();
  const fila = (team: Team) => {
    let f = filas.get(team.id);
    if (!f) { f = { team, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0, racha: [], _historial: [] }; filas.set(team.id, f); }
    return f;
  };
  for (const m of partidos) {
    if (!m.local || !m.visitor || m.localScore === null || m.visitorScore === null) continue;
    const l = fila(m.local), v = fila(m.visitor);
    const apuntar = (f: typeof l, a: number, c: number) => {
      f.pj += 1; f.gf += a; f.gc += c;
      const r = a > c ? 'G' : a === c ? 'E' : 'P';
      if (r === 'G') { f.g += 1; f.pts += 3; } else if (r === 'E') { f.e += 1; f.pts += 1; } else f.p += 1;
      f._historial.push({ k: m.kickoff, r });
    };
    apuntar(l, m.localScore, m.visitorScore);
    apuntar(v, m.visitorScore, m.localScore);
  }
  return [...filas.values()]
    .map(({ _historial, ...f }) => ({
      ...f,
      dg: f.gf - f.gc,
      racha: _historial.sort((a, b) => a.k.localeCompare(b.k)).slice(-5).map((h) => h.r),
    }))
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.team.name.localeCompare(b.team.name, 'es'));
}
