import type { AlertLevel, ClauseAlert } from '../laliga/alerts/clause-alerts.ts';

/**
 * Cuándo una alerta merece empujar una notificación, y cuándo se calla.
 *
 * Esto es el corazón de "avisa antes, no informes después": sin esta pieza, un
 * cron que corre cada 15 minutos mandaría el mismo aviso 96 veces al día por
 * cada jugador que sigue igual de cerca de su cláusula. Eso no es avisar, es
 * spam, y en dos días el usuario apaga las notificaciones y perdemos la
 * funcionalidad entera.
 *
 * La regla: se notifica una alerta la PRIMERA vez que aparece, y otra vez si
 * EMPEORA (sube de nivel). Si se mantiene igual o mejora, no se dice nada — ya
 * se dijo, y repetirlo no añade información. `CRITICA` es el nivel mas grave.
 *
 * Puro y sin red: recibe el estado anterior y las alertas actuales, devuelve
 * qué avisar y el estado nuevo que hay que guardar.
 */

/** Cuanto de grave es cada nivel. Menor = mas grave. */
const GRAVEDAD: Record<AlertLevel, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, INFORMATIVA: 3 };

/** `player.id` -> ultimo nivel por el que YA se avisó. */
export type EstadoAlertas = Map<string, AlertLevel>;

export type CambioAAvisar = {
  alert: ClauseAlert;
  /** `null` si es la primera vez que este jugador entra en el informe. */
  nivelAnterior: AlertLevel | null;
};

export type ResultadoDiff = {
  aAvisar: CambioAAvisar[];
  /** El estado a guardar: reemplaza al anterior entero, no se fusiona. */
  estadoNuevo: EstadoAlertas;
};

/**
 * Compara el estado guardado con las alertas actuales.
 *
 * Un jugador que ya no aparece en `actuales` —se vendió, dejó de estar cerca de
 * su cláusula— simplemente desaparece del estado nuevo. No hace falta avisar de
 * que una alerta se apagó: el silencio ya lo dice.
 */
export function diferenciarAlertas(anterior: EstadoAlertas, actuales: ClauseAlert[]): ResultadoDiff {
  const aAvisar: CambioAAvisar[] = [];
  const estadoNuevo: EstadoAlertas = new Map();

  for (const alert of actuales) {
    const nivelAnterior = anterior.get(alert.player.id) ?? null;
    estadoNuevo.set(alert.player.id, alert.level);

    const esNueva = nivelAnterior === null;
    const haEmpeorado = nivelAnterior !== null && GRAVEDAD[alert.level] < GRAVEDAD[nivelAnterior];

    if (esNueva || haEmpeorado) {
      aAvisar.push({ alert, nivelAnterior });
    }
  }

  return { aAvisar, estadoNuevo };
}

/** El estado nuevo como pares `[playerId, level]`, listo para guardar en fila a fila. */
export function estadoAFilas(estado: EstadoAlertas): Array<[string, AlertLevel]> {
  return [...estado.entries()];
}
