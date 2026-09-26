// Relativo y con extensión: este módulo se ejecuta tal cual desde las pruebas.
import type { Cambio, Once } from '../../../app/fantasy/prediccion.ts';
import type { NotificacionPush } from './notify-message.ts';

/**
 * El aviso de la víspera: «La jornada 7 empieza mañana a las 21:00. Tu mejor
 * once ≈ 57 pts. Cambia a Merino por Vivian».
 *
 * Es el aviso que más puntos vale, porque llega cuando todavía se puede hacer
 * algo: antes de que cierre la alineación. Se manda UNA vez por jornada, en la
 * ventana entre 26 h y 1 h antes del primer partido (el repaso corre cada
 * hora, así que siempre cae dentro).
 */

const HORA = 3_600_000;
export const VENTANA_MAXIMA_MS = 26 * HORA;
export const VENTANA_MINIMA_MS = 1 * HORA;

/** El primer partido de la jornada, o `null` si no hay ninguno con hora. */
export function primerPartido(kickoffs: string[]): number | null {
  const horas = kickoffs.map((k) => Date.parse(k)).filter((t) => !Number.isNaN(t));
  return horas.length ? Math.min(...horas) : null;
}

export function tocaPrevia(inicio: number | null, ahora: Date): boolean {
  if (inicio === null) return false;
  const faltan = inicio - ahora.getTime();
  return faltan > VENTANA_MINIMA_MS && faltan <= VENTANA_MAXIMA_MS;
}

/** «hoy a las 21:00», «mañana a las 14:00» o «el sábado a las 16:15», en hora de España. */
export function cuando(inicio: number, ahora: Date): string {
  const zona = 'Europe/Madrid';
  const dia = (t: number) => new Date(t).toLocaleDateString('en-CA', { timeZone: zona });
  const hora = new Date(inicio).toLocaleTimeString('es-ES', { timeZone: zona, hour: '2-digit', minute: '2-digit' });
  const hoy = dia(ahora.getTime());
  const manana = dia(ahora.getTime() + 24 * HORA);
  if (dia(inicio) === hoy) return `hoy a las ${hora}`;
  if (dia(inicio) === manana) return `mañana a las ${hora}`;
  const semana = new Date(inicio).toLocaleDateString('es-ES', { timeZone: zona, weekday: 'long' });
  return `el ${semana} a las ${hora}`;
}

const pts = (n: number) => n.toFixed(1).replace('.', ',');

export function mensajeDePrevia(args: {
  jornada: number;
  inicio: number;
  ahora: Date;
  optimo: Once;
  actual: Once;
  cambios: Cambio[];
  leagueId: string;
}): NotificacionPush {
  const { jornada, inicio, ahora, optimo, actual, cambios, leagueId } = args;
  const ganancia = optimo.total - actual.total;
  const lista = cambios
    .slice(0, 3)
    .map((c) => (c.sale ? `${c.entra.player.name} por ${c.sale.player.name}` : `mete a ${c.entra.player.name}`))
    .join('; ');
  const consejo = cambios.length > 0 && ganancia >= 0.5
    ? ` Cambia ${lista} (≈ +${pts(ganancia)}).`
    : ' Tu once más probable ya es el que más suma.';
  return {
    titulo: `Jornada ${jornada} · empieza ${cuando(inicio, ahora)}`,
    cuerpo: `Tu mejor once ≈ ${pts(optimo.total)} pts.${consejo} Revisa tu alineación antes de que cierre.`,
    url: `/?league=${encodeURIComponent(leagueId)}&section=plantilla`,
    tag: `previa-${leagueId}-${jornada}`,
  };
}

/** Marca en `fantasy_alert_state` de que la víspera de esa jornada ya se avisó. */
export const clavePrevia = (jornada: number) => `previa:${jornada}`;
