import type { Team } from '@/src/domain/fantasy';
import { dificultad, type CuotasPartido, type Probabilidades } from './implied.ts';

/**
 * De partidos con cuotas a "que tan difícil lo tiene CADA equipo".
 *
 * El calendario razona por partidos; la plantilla razona por jugadores, y un
 * jugador solo sabe de que equipo es. Esta pieza da la vuelta a la tabla: para
 * cada id de equipo, contra quien juega y con que precio le pone la casa el
 * ganar.
 *
 * Lo que NO hace: pronosticar cuantos puntos va a sacar nadie. La probabilidad
 * es la de que gane su equipo, calculada desde la cuota, y se etiqueta como
 * calculo nuestro alla donde se enseña. Un jugador de un equipo favorito puede
 * quedarse en el banquillo y hacer cero.
 *
 * Vive aparte de las rutas por lo de siempre aqui: `read.ts` arrastra alias
 * `@/` y no se puede importar desde un test, asi que lo comprobable se saca.
 */

export type DificultadDeEquipo = {
  /** El rival, ya con nombre y escudo: la pantalla no vuelve a buscarlo. */
  rivalId: string;
  rivalName: string;
  rivalShortName: string;
  rivalBadge: string;
  /** `true` si su equipo juega en casa. Cambia a cual de las cuotas mirar. */
  enCasa: boolean;
  kickoff: string;
  /** `true` si el partido ya tiene marcador: entonces la cuota es historica. */
  jugado: boolean;
  /** Cuotas tal cual las publica la casa, en orden 1-X-2 del partido. */
  cuotas: CuotasPartido;
  probabilidades: Probabilidades;
  /** Probabilidad de que gane SU equipo, ya sin el margen de la casa. */
  probabilidadGanar: number;
  /** «Muy favorable», «Igualado»… Acompaña siempre al numero, nunca lo sustituye. */
  etiqueta: string;
  /** Quien publica la cuota. Se enseña siempre: es su precio, no el nuestro. */
  casa: string;
};

/** Lo minimo que hace falta de un partido para repartirlo entre sus dos equipos. */
export type PartidoConCuotas = {
  kickoff: string;
  local: Team | null;
  visitor: Team | null;
  localScore: number | null;
  visitorScore: number | null;
  odds: { cuotas: CuotasPartido; probabilidades: Probabilidades; casa: string } | null;
};

/**
 * Indice `id de equipo -> su partido`, solo con los que tienen cuotas.
 *
 * Un equipo sin cuotas simplemente no aparece, y la pantalla lo dice. No se
 * inventa una dificultad "media" para rellenar: no saber es un estado, y se
 * enseña como tal.
 */
export function dificultadPorEquipo(partidos: PartidoConCuotas[]): Record<string, DificultadDeEquipo> {
  const indice: Record<string, DificultadDeEquipo> = {};

  for (const partido of partidos) {
    const { local, visitor, odds } = partido;
    if (!odds || !local || !visitor) continue;

    const jugado = partido.localScore !== null && partido.visitorScore !== null;
    const comun = {
      kickoff: partido.kickoff,
      jugado,
      cuotas: odds.cuotas,
      probabilidades: odds.probabilidades,
      casa: odds.casa,
    };

    indice[local.id] = {
      ...comun,
      rivalId: visitor.id,
      rivalName: visitor.name,
      rivalShortName: visitor.shortName,
      rivalBadge: visitor.badge,
      enCasa: true,
      probabilidadGanar: odds.probabilidades.local,
      etiqueta: dificultad(odds.probabilidades.local),
    };

    indice[visitor.id] = {
      ...comun,
      rivalId: local.id,
      rivalName: local.name,
      rivalShortName: local.shortName,
      rivalBadge: local.badge,
      enCasa: false,
      probabilidadGanar: odds.probabilidades.visitante,
      etiqueta: dificultad(odds.probabilidades.visitante),
    };
  }

  return indice;
}
