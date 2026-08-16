import type { Position } from '@/src/domain/fantasy';

/**
 * El once mas probable de una plantilla.
 *
 * Vive aparte porque lo necesitan dos pantallas —la tuya y la de cada rival— y
 * porque es una funcion PURA: se le dan jugadores con su probabilidad y elige
 * once dentro de una formacion valida. Aqui no se pide nada por red, asi que se
 * puede probar de verdad.
 *
 * Lo que esto NO es: un consejo. No dice a quien alinear ni a quien fichar. Solo
 * ordena por la probabilidad que publica FutbolFantasy y respeta las formaciones
 * que el juego permite.
 */

export type ConProbabilidad = {
  id: string;
  position: Position;
  averagePoints: number;
  lineupProbability?: number;
  lineupExpectedStarter?: boolean;
};

export const FORMATIONS: Record<Position, number>[] = [
  { POR: 1, DEF: 3, MED: 4, DEL: 3 },
  { POR: 1, DEF: 4, MED: 3, DEL: 3 },
  { POR: 1, DEF: 4, MED: 4, DEL: 2 },
  { POR: 1, DEF: 5, MED: 3, DEL: 2 },
  { POR: 1, DEF: 5, MED: 4, DEL: 1 },
];

/**
 * Orden interno.
 *
 * Un titular publicado SIN porcentaje cuenta como señal fuerte (100) porque la
 * fuente dice que sale, no porque nos inventemos su probabilidad. Y quien no
 * tiene ninguna señal va a -1, por detras incluso del que tiene un 0 %: no es lo
 * mismo "se sabe que es improbable" que "no se sabe nada de el".
 */
export function lineupRank(player: ConProbabilidad): number {
  return player.lineupProbability ?? (player.lineupExpectedStarter ? 100 : -1);
}

export function bestEleven<T extends ConProbabilidad>(
  players: T[],
): { formation: string; starters: T[]; bench: T[] } {
  let best: { score: number; formation: string; starters: T[] } | null = null;

  for (const formation of FORMATIONS) {
    const starters = (Object.keys(formation) as Position[]).flatMap((position) =>
      players
        .filter((player) => player.position === position)
        .sort((a, b) => lineupRank(b) - lineupRank(a) || b.averagePoints - a.averagePoints)
        .slice(0, formation[position]),
    );
    // Una plantilla corta puede no llenar esta formacion: se descarta entera en
    // vez de completarla con huecos.
    if (starters.length !== 11) continue;
    const score = starters.reduce((sum, player) => sum + Math.max(lineupRank(player), 0), 0);
    const label = `1-${formation.DEF}-${formation.MED}-${formation.DEL}`;
    if (!best || score > best.score) best = { score, formation: label, starters };
  }

  const starters =
    best?.starters ?? players.slice().sort((a, b) => lineupRank(b) - lineupRank(a)).slice(0, 11);
  const ids = new Set(starters.map((player) => player.id));

  return {
    formation: best?.formation ?? 'Once probable',
    starters,
    bench: players.filter((player) => !ids.has(player.id)),
  };
}
