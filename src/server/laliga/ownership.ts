import type { LeagueTeam } from '@/src/domain/fantasy';
import { isClauseShielded } from './alerts/clause-alerts.ts';

/**
 * De quien es un jugador dentro de una liga, y si se le puede pagar la clausula.
 *
 * Puro y con tests porque aqui se decide si se enseña un boton que MUEVE DINERO
 * de verdad y no se puede deshacer. Equivocarse hacia el lado de enseñarlo
 * cuando no toca es peor que no enseñarlo: el que paga por error no recupera al
 * jugador ni el dinero.
 *
 * El motivo por el que NO se puede se devuelve siempre. La pantalla necesita
 * poder decir «bloqueada hasta el jueves» en vez de un boton apagado sin
 * explicacion, que es de las cosas que mas desconciertan de una interfaz.
 */

export type Propiedad = {
  /** `null` si nadie de la liga lo tiene: entonces es del mercado. */
  duenoManagerId: string | null;
  duenoNombre: string | null;
  esMio: boolean;
  /** Clausula oficial. `null` si LALIGA no la publica: no se estima. */
  clausula: number | null;
  blindado: boolean;
  /** Cuando se levanta el blindaje, si LALIGA lo dice. */
  blindadoHasta: string | null;
  /** Tu caja oficial. `null` cuando LALIGA no la publica. */
  miCaja: number | null;
  /** `true` solo si se dan TODAS las condiciones para poder pagar. */
  sePuedePagar: boolean;
  /** Por que no se puede, en castellano. `null` si si se puede. */
  motivo: string | null;
};

/**
 * La situacion de `playerId` en esta liga.
 *
 * `equipos` son todas las plantillas de la liga y `miManagerId` quien pregunta.
 */
export function propiedadDe(
  equipos: LeagueTeam[],
  playerId: string,
  miManagerId: string,
  ahora: Date = new Date(),
): Propiedad {
  const dueno = equipos.find((equipo) => equipo.players.some((jugador) => jugador.id === playerId));
  const jugador = dueno?.players.find((candidato) => candidato.id === playerId);
  const mio = equipos.find((equipo) => equipo.manager.id === miManagerId);
  const miCaja = mio?.teamMoney ?? null;

  const base = {
    duenoManagerId: dueno?.manager.id ?? null,
    duenoNombre: dueno?.manager.name ?? null,
    esMio: dueno?.manager.id === miManagerId,
    clausula: jugador?.buyoutClause ?? null,
    blindado: jugador ? isClauseShielded(jugador, ahora) : false,
    blindadoHasta: jugador?.shieldedUntil ?? null,
    miCaja,
  };

  const no = (motivo: string): Propiedad => ({ ...base, sePuedePagar: false, motivo });

  if (!dueno || !jugador) return no('Ahora mismo no lo tiene nadie de tu liga, así que no hay cláusula que pagar.');
  if (base.esMio) return no('Es tuyo: la cláusula de un jugador propio no se paga.');
  if (base.clausula === null) return no('LALIGA no publica la cláusula de este jugador.');
  if (base.blindado) return no('Su dueño lo tiene blindado ahora mismo.');
  /*
   * La caja solo bloquea cuando SE SABE que no llega. Si LALIGA no la publica no
   * se adivina: se deja intentar y que conteste LALIGA, que es quien manda. Dar
   * por hecho que no tienes dinero seria inventarse un motivo.
   */
  if (miCaja !== null && miCaja < base.clausula) return no('No te llega la caja para pagarla.');

  return { ...base, sePuedePagar: true, motivo: null };
}
