import type { ClauseAlert } from '../laliga/alerts/clause-alerts.ts';

/**
 * El texto de una notificación push, para una alerta que se ha decidido avisar.
 *
 * Va a la pantalla de bloqueo del móvil de alguien: tiene que caber en dos
 * líneas y decir lo importante sin abrir la app. Y como toda esta app, nada de
 * lo que diga puede ser más de lo que sabemos: la cláusula y el valor son datos
 * oficiales, el hueco es una resta. Nada de "va a subir" ni "cómpralo ya".
 *
 * Distingue si el jugador es tuyo o de un rival, porque la acción que sugiere
 * es opuesta: el tuyo puede interesarte blindarlo o venderlo antes de perderlo;
 * el de un rival puede interesarte pagarlo. La notificación no dice qué hacer
 * —eso sería consejo, prohibido— solo por qué mirar.
 */

const PALABRA_NIVEL: Record<ClauseAlert['level'], string> = {
  CRITICA: 'Crítico',
  ALTA: 'Muy cerca',
  MEDIA: 'Se acerca',
  INFORMATIVA: 'A vigilar',
};

export type NotificacionPush = {
  titulo: string;
  cuerpo: string;
  /** A dónde lleva al tocarla. Relativo: el service worker lo resuelve contra su origen. */
  url: string;
  /** Para agrupar reemplazos: una notificación más grave del MISMO jugador sustituye a la anterior en la bandeja. */
  tag: string;
};

const millones = (euros: number) => `${(euros / 1_000_000).toFixed(1).replace('.', ',')} M€`;

export function mensajeDeAlerta(alert: ClauseAlert, esTuyo: boolean, leagueId: string): NotificacionPush {
  const { player, official, calculated, level } = alert;
  const posesion = esTuyo ? 'Tu jugador' : `${alert.owner.managerName} tiene a`;

  const cuerpo = alert.alreadyReachable
    ? `Su valor (${millones(official.marketValue)}) ya iguala o supera su cláusula (${millones(official.buyoutClause)}).`
    : `Su valor está a ${millones(calculated.gap)} de su cláusula de ${millones(official.buyoutClause)}.`;

  return {
    titulo: `${PALABRA_NIVEL[level]} · ${player.name}`,
    cuerpo: `${posesion} ${player.name}. ${cuerpo}`,
    url: `/?league=${encodeURIComponent(leagueId)}&section=alertas&player=${encodeURIComponent(player.id)}`,
    tag: `clausula-${leagueId}-${player.id}`,
  };
}
