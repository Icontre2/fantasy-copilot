// `POSITIONS` es un import de VALOR, y el alias `@/` solo existe al compilar:
// con alias, este módulo no se puede ejecutar desde una prueba de node. Por eso
// va en relativo, igual que en `src/server/**`. El import de tipo sí puede usar
// el alias porque se borra al compilar.
import { POSITIONS } from "../../src/domain/fantasy.ts";
import type { Position } from "@/src/domain/fantasy";
import type { ClauseAlert } from "./types";

/**
 * Quién está subiendo más de valor, y con qué filtros.
 *
 * ── De dónde salen estos datos, y qué NO son ────────────────────────────────
 * De `/api/fantasy/leagues/{id}/alerts`, la misma respuesta que pinta la
 * pantalla de Alertas. No se pide nada nuevo: la tendencia diaria ya está
 * calculada ahí (`calculated.dailyTrend` en euros y `dailyTrendRatio` en
 * porcentaje sobre el valor).
 *
 * Eso trae una limitación que la pantalla tiene que decir en voz alta, porque
 * si no el ranking miente por omisión. `build.ts` solo descarga el histórico de
 * los jugadores que ya están razonablemente cerca de su cláusula (prefiltro del
 * 60% y tope de 150 peticiones), así que **este ranking cubre a los jugadores
 * vigilados, no a toda la liga**. Un jugador lejísimos de su cláusula pero
 * subiendo como un cohete no aparece aquí — y es justo el que más rabia daría
 * perderse.
 *
 * Cubrirlo de verdad costaría una petición de histórico por jugador de la liga
 * (~480 en una liga de 20). Es una decisión de presupuesto, no un descuido.
 */

export type OrdenDeSubida = "EUROS" | "PORCENTAJE";
export type FiltroDePosicion = "TODAS" | Position;

export const POSICIONES: FiltroDePosicion[] = ["TODAS", ...POSITIONS];

export type Subida = {
  alert: ClauseAlert;
  /** Euros por día. Siempre presente: sin tendencia no hay fila. */
  euros: number;
  /** La misma subida como fracción del valor. `0.02` = 2% al día. */
  ratio: number;
};

export type CriteriosDeSubida = {
  alerts: ClauseAlert[];
  orden: OrdenDeSubida;
  posicion: FiltroDePosicion;
  /** Texto libre: nombre, equipo o manager. */
  busqueda?: string;
  /** Incluir a los jugadores que bajan de valor. Por defecto no. */
  incluirBajadas?: boolean;
};

/**
 * Ordena por subida y aplica los filtros.
 *
 * Solo entran los jugadores con `dailyTrend` calculado: sin histórico
 * suficiente no hay tendencia, y colocar un cero en su lugar sería inventarse
 * que un jugador no se mueve cuando lo que pasa es que no lo sabemos. Esa
 * distinción es la misma que ya hace la pantalla de Alertas, y es la razón de
 * que `sinTendencia` se cuente aparte y se pueda enseñar.
 */
export function ordenarSubidas(criterios: CriteriosDeSubida): { filas: Subida[]; sinTendencia: number } {
  const { alerts, orden, posicion, busqueda = "", incluirBajadas = false } = criterios;
  const texto = busqueda.trim().toLowerCase();

  let sinTendencia = 0;
  const filas: Subida[] = [];

  for (const alert of alerts) {
    if (posicion !== "TODAS" && alert.player.position !== posicion) continue;
    if (texto !== "") {
      const campos = `${alert.player.name} ${alert.player.team} ${alert.owner.managerName}`.toLowerCase();
      if (!campos.includes(texto)) continue;
    }

    const { dailyTrend, dailyTrendRatio } = alert.calculated;
    if (dailyTrend === null || dailyTrendRatio === null) {
      sinTendencia += 1;
      continue;
    }
    if (!incluirBajadas && dailyTrend <= 0) continue;

    filas.push({ alert, euros: dailyTrend, ratio: dailyTrendRatio });
  }

  /*
   * Los dos órdenes NO dan la misma lista, y esa es la gracia de tener los dos:
   * 300k/día sobre un jugador de 30 M es un 1%, y 80k/día sobre uno de 2 M es
   * un 4%. El primero mueve más dinero; el segundo se está revalorizando más
   * deprisa. Cuál importa depende de si buscas un fichaje caro o una ganga que
   * se te escapa.
   */
  const clave = (fila: Subida) => (orden === "EUROS" ? fila.euros : fila.ratio);
  filas.sort((a, b) => clave(b) - clave(a) || a.alert.player.name.localeCompare(b.alert.player.name, "es"));

  return { filas, sinTendencia };
}

/** Cuántos jugadores hay por posición, para poder desactivar un filtro vacío. */
export function conteoPorPosicion(alerts: ClauseAlert[]): Record<FiltroDePosicion, number> {
  const conteo = { TODAS: 0 } as Record<FiltroDePosicion, number>;
  for (const posicion of POSITIONS) conteo[posicion] = 0;
  for (const alert of alerts) {
    conteo.TODAS += 1;
    const posicion = alert.player.position as Position;
    if (posicion in conteo) conteo[posicion] += 1;
  }
  return conteo;
}
