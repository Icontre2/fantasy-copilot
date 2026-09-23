// Relativo y con extensión: este módulo se ejecuta tal cual desde las pruebas.
import type { Defensa } from '../../../app/fantasy/defensa.ts';
import type { NotificacionPush } from './notify-message.ts';

/**
 * Qué avisar de Defensa en el repaso diario: SOLO lo nuevo.
 *
 * El aviso útil es «Ana ya puede pagar la cláusula de Pedri» el día que pasa,
 * no cada mañana mientras siga pasando. Por eso se guarda, por jugador, qué
 * rivales podían pagarlo en el último repaso, y solo se avisa de los que
 * aparecen. Si un rival deja de poder y vuelve a poder, se vuelve a avisar:
 * es una amenaza nueva.
 *
 * Un jugador blindado no cuenta como expuesto —hoy nadie puede pagarlo—, así
 * que al levantarse el blindaje sí salta el aviso si alguien llega.
 */

/** `player.id` → ids de los rivales que podían pagarlo. */
export type EstadoDefensa = Map<string, Set<string>>;

export type AvisoDeDefensa = { defensa: Defensa; nuevos: Array<{ managerId: string; nombre: string }> };

export function diferenciarDefensa(anterior: EstadoDefensa, defensas: Defensa[]): { aAvisar: AvisoDeDefensa[]; estadoNuevo: EstadoDefensa } {
  const aAvisar: AvisoDeDefensa[] = [];
  const estadoNuevo: EstadoDefensa = new Map();

  for (const defensa of defensas) {
    if (defensa.nivel !== 'EXPUESTO') continue;
    const ahora = new Set(defensa.pueden.map((c) => c.managerId));
    estadoNuevo.set(defensa.player.id, ahora);
    const antes = anterior.get(defensa.player.id) ?? new Set<string>();
    const nuevos = defensa.pueden.filter((c) => !antes.has(c.managerId)).map((c) => ({ managerId: c.managerId, nombre: c.nombre }));
    if (nuevos.length > 0) aAvisar.push({ defensa, nuevos });
  }

  return { aAvisar, estadoNuevo };
}

const millones = (euros: number) => `${(euros / 1_000_000).toFixed(1).replace('.', ',')} M€`;

export function mensajeDeDefensa({ defensa, nuevos }: AvisoDeDefensa, leagueId: string): NotificacionPush {
  const quien = nuevos.length === 1 ? `${nuevos[0]!.nombre} ya puede` : `${nuevos.map((n) => n.nombre).join(', ')} ya pueden`;
  const coste = defensa.proteccion
    ? ` Subirla a ${millones(defensa.proteccion.clausulaObjetivo)} te costaría ≈ ${millones(defensa.proteccion.coste)}.`
    : '';
  return {
    titulo: `En riesgo · ${defensa.player.name}`,
    cuerpo: `${quien} pagar su cláusula de ${millones(defensa.clausula ?? 0)}.${coste}`,
    url: `/?league=${encodeURIComponent(leagueId)}&section=defensa`,
    tag: `defensa-${leagueId}-${defensa.player.id}`,
  };
}

/** El estado va en `fantasy_alert_state` con este prefijo, para no mezclarse con el de cláusulas. */
export const PREFIJO_DEFENSA = 'defensa:';

export function estadoAFilas(estado: EstadoDefensa): Array<{ player_id: string; level: string }> {
  return [...estado.entries()].map(([playerId, rivales]) => ({ player_id: `${PREFIJO_DEFENSA}${playerId}`, level: [...rivales].sort().join(',') }));
}

export function filasAEstado(filas: Array<{ player_id: string; level: string }>): EstadoDefensa {
  const estado: EstadoDefensa = new Map();
  for (const fila of filas) {
    if (!fila.player_id.startsWith(PREFIJO_DEFENSA)) continue;
    estado.set(fila.player_id.slice(PREFIJO_DEFENSA.length), new Set(fila.level.split(',').filter(Boolean)));
  }
  return estado;
}
