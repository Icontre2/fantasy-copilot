import { FALLBACK_TEAMS } from './teams.ts';

/**
 * A que equipo real pertenece un jugador.
 *
 * Existe como modulo aparte por una razon concreta: esto ya se rompio una vez y
 * no habia forma de probarlo. LALIGA manda el equipo de DOS maneras segun el
 * endpoint —anidado en `team` o plano en `teamId`— y el mapa solo leia la
 * anidada. El catalogo publico usa la plana en sus 792 jugadores, asi que todos
 * se quedaban sin equipo; y como la probabilidad de titularidad se busca por
 * equipo, la plantilla entera aparecia sin porcentajes.
 *
 * `mappers.ts` no se puede importar desde un test (arrastra rutas con alias
 * `@/`), asi que la decision vive aqui, sin dependencias que estorben.
 */
export function resolveTeamId(
  nested: string | undefined,
  flat: string | undefined,
): string | undefined {
  return nested ?? flat;
}

/**
 * Abreviatura del equipo: mapa oficial y, si falta, derivada del nombre.
 *
 * Devuelve `—` cuando no hay ni id conocido ni nombre. Es deliberado: preferimos
 * el guion de "no lo sé" a inventar unas siglas que el usuario leeria como
 * ciertas.
 */
export function shortTeamName(
  teamId: string | undefined,
  fullName: string | undefined,
): string {
  if (teamId && FALLBACK_TEAMS[teamId]) return FALLBACK_TEAMS[teamId].shortName;
  if (!fullName) return '—';
  const letters = fullName.replace(/[^A-Za-zÀ-ÿ ]/g, '').trim();
  const words = letters.split(/\s+/).filter((word) => !/^(cf|fc|rc|cd|ud|sd|ca|rcd)$/i.test(word));
  return (words[0] ?? letters).toUpperCase().slice(0, 3);
}
