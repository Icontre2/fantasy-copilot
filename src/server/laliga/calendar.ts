import type { Team } from '@/src/domain/fantasy';

/**
 * Traduccion del calendario de LALIGA a partidos con nombre y hora.
 *
 * Vive aparte de `read.ts` por lo de siempre en este proyecto: `read.ts`
 * arrastra rutas con alias `@/` y no se puede importar desde un test, asi que
 * lo que se pueda comprobar se saca aqui.
 *
 * La respuesta solo trae ids de equipo. Si un id no esta en el mapa se deja el
 * equipo en `null` y la pantalla lo dice, en vez de pintar un partido contra un
 * rival sin nombre.
 */

export type Match = {
  id: string;
  /** Hora de inicio en ISO, tal cual la publica LALIGA. */
  kickoff: string;
  local: Team | null;
  visitor: Team | null;
  localScore: number | null;
  visitorScore: number | null;
};

type ApiMatchLike = {
  id: string;
  matchDate: string;
  localId: string;
  visitorId: string;
  localScore?: number | null;
  visitorScore?: number | null;
};

export function mapCalendar(
  matches: ApiMatchLike[],
  teams: Record<string, Team>,
): Match[] {
  return matches
    .map((match) => ({
      id: match.id,
      kickoff: match.matchDate,
      local: teams[match.localId] ?? null,
      visitor: teams[match.visitorId] ?? null,
      /*
       * Un partido sin jugar trae `null`, no un cero. Se propaga tal cual: si
       * aqui se normalizara a 0, la pantalla no podria distinguir un 0-0 real
       * de un partido que aun no ha empezado.
       */
      localScore: match.localScore ?? null,
      visitorScore: match.visitorScore ?? null,
    }))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}
