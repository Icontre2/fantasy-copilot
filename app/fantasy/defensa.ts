// Relativo a proposito, como `risers.ts`: el alias `@/` solo existe al
// compilar y este modulo se ejecuta tal cual desde las pruebas de node.
import type { ManagerEconomy, PlayerWithProbability } from "./types";

/**
 * ¿Quién puede quitarme a mis jugadores HOY, y cuánto me cuesta impedirlo?
 *
 * Es la pregunta que más se repite en una liga privada, y la app ya tenía las
 * dos mitades por separado: las cláusulas de tu plantilla en Inicio y la caja
 * de cada rival en Economía. Aquí se cruzan.
 *
 * ── Lo que es dato y lo que es estimación ───────────────────────────────────
 * - La cláusula y el blindaje son OFICIALES: LALIGA los publica tal cual.
 * - La caja de un rival casi nunca lo es: LALIGA solo publica la tuya. Para
 *   los demás se usa la caja reconstruida (100 M€ + operaciones + puntos −
 *   cláusulas subidas), y cada cifra que sale de ahí va marcada `estimado`.
 * - El coste de subir la cláusula usa la regla 2:1 de LALIGA Fantasy (1 € de
 *   caja sube 2 € de cláusula), la misma que ya usa Economía.
 *
 * Puro a propósito: sin fechas del sistema ni red, para poder probar cada caso.
 */

/** Regla 2:1: cada euro de caja sube dos de cláusula. Ver `economy/activity.ts`. */
export const EUROS_DE_CLAUSULA_POR_EURO = 2;

/** Las cláusulas objetivo se redondean al alza a este paso, como las escribe una persona. */
const PASO_DE_CLAUSULA = 100_000;

export type Comprador = {
  managerId: string;
  nombre: string;
  /** Dinero con el que podría pagar hoy. */
  poder: number;
  /** `true` si `poder` es la caja reconstruida y no la oficial. */
  estimado: boolean;
};

export type NivelDeDefensa = "EXPUESTO" | "BLINDADO" | "SEGURO" | "SIN_CLAUSULA";

export type Proteccion = {
  /** Cláusula mínima para que ningún rival pueda pagarla con su caja de hoy. */
  clausulaObjetivo: number;
  /** Caja que cuesta llegar a ella con la regla 2:1. */
  coste: number;
  /** `null` cuando no se conoce tu caja. */
  asequible: boolean | null;
};

export type Defensa = {
  player: PlayerWithProbability;
  nivel: NivelDeDefensa;
  clausula: number | null;
  /** Fecha ISO de fin del blindaje, solo si sigue vigente. */
  blindadoHasta: string | null;
  /**
   * Rivales cuya caja cubre la cláusula, de más a menos dinero. Si el jugador
   * está blindado, son los que podrían pagarla en cuanto se levante.
   */
  pueden: Comprador[];
  /** Cuánto le falta al rival más rico para pagarla. Solo si nadie puede. */
  margen: number | null;
  proteccion: Proteccion | null;
};

/**
 * La caja de cada rival, la mejor que se tenga: oficial si LALIGA la publica,
 * reconstruida si no. Sin ninguna de las dos, el rival no entra: poner un cero
 * sería decir que no tiene dinero cuando lo que pasa es que no lo sabemos.
 */
export function compradoresDeLiga(
  competitors: Array<{ manager: { id: string; name: string }; teamMoney?: number; estimatedCash?: number }>,
  economies: ManagerEconomy[],
): Comprador[] {
  const compradores: Comprador[] = [];
  for (const rival of competitors) {
    const economia = economies.find((item) => item.managerId === rival.manager.id);
    const oficial = rival.teamMoney ?? economia?.cajaOficial ?? null;
    if (oficial !== null && Number.isFinite(oficial)) {
      compradores.push({ managerId: rival.manager.id, nombre: rival.manager.name, poder: oficial, estimado: false });
      continue;
    }
    const reconstruida = economia?.cajaReconstruida ?? rival.estimatedCash;
    if (reconstruida === undefined || !Number.isFinite(reconstruida)) continue;
    compradores.push({ managerId: rival.manager.id, nombre: rival.manager.name, poder: reconstruida, estimado: true });
  }
  return compradores.sort((a, b) => b.poder - a.poder);
}

/** Quién podría pagar una cláusula concreta. */
export function quienesPueden(clausula: number, compradores: Comprador[]): Comprador[] {
  return compradores.filter((c) => c.poder >= clausula).sort((a, b) => b.poder - a.poder);
}

/** Caja necesaria para subir de `actual` a `objetivo` con la regla 2:1. */
export function costeDeSubida(actual: number, objetivo: number): number {
  if (objetivo <= actual) return 0;
  return Math.ceil((objetivo - actual) / EUROS_DE_CLAUSULA_POR_EURO);
}

function blindajeVigente(player: PlayerWithProbability, ahora: Date): string | null {
  if (!player.isShielded) return null;
  if (!player.shieldedUntil) return null;
  const fin = new Date(player.shieldedUntil);
  if (Number.isNaN(fin.getTime()) || fin.getTime() <= ahora.getTime()) return null;
  return player.shieldedUntil;
}

export function analizarJugador(
  player: PlayerWithProbability,
  compradores: Comprador[],
  miCaja: number | null,
  ahora: Date,
): Defensa {
  const clausula = typeof player.buyoutClause === "number" && Number.isFinite(player.buyoutClause) ? player.buyoutClause : null;
  if (clausula === null) {
    return { player, nivel: "SIN_CLAUSULA", clausula: null, blindadoHasta: null, pueden: [], margen: null, proteccion: null };
  }

  const blindadoHasta = blindajeVigente(player, ahora);
  // `isShielded` sin fecha: LALIGA dice que está blindado pero no hasta cuándo.
  // Se respeta el dato oficial en vez de suponer que ya se levantó.
  const blindado = blindadoHasta !== null || (player.isShielded === true && !player.shieldedUntil);
  const pueden = quienesPueden(clausula, compradores);
  const masRico = compradores[0]?.poder ?? null;

  let proteccion: Proteccion | null = null;
  if (pueden.length > 0 && masRico !== null) {
    const clausulaObjetivo = Math.ceil((masRico + 1) / PASO_DE_CLAUSULA) * PASO_DE_CLAUSULA;
    const coste = costeDeSubida(clausula, clausulaObjetivo);
    proteccion = { clausulaObjetivo, coste, asequible: miCaja === null ? null : miCaja >= coste };
  }

  const nivel: NivelDeDefensa = blindado ? "BLINDADO" : pueden.length > 0 ? "EXPUESTO" : "SEGURO";
  const margen = pueden.length === 0 && masRico !== null ? clausula - masRico : null;
  return { player, nivel, clausula, blindadoHasta, pueden, margen, proteccion };
}

const ORDEN_DE_NIVEL: Record<NivelDeDefensa, number> = { EXPUESTO: 0, BLINDADO: 1, SEGURO: 2, SIN_CLAUSULA: 3 };

/**
 * Toda la plantilla, ordenada por urgencia: primero los que te pueden quitar
 * hoy (más rivales capaces antes), luego los blindados (el que antes se
 * desblinda antes), luego los seguros (el de menos margen antes).
 */
export function analizarDefensa(
  players: PlayerWithProbability[],
  compradores: Comprador[],
  miCaja: number | null,
  ahora: Date,
): Defensa[] {
  return players
    .map((player) => analizarJugador(player, compradores, miCaja, ahora))
    .sort((a, b) => {
      const nivel = ORDEN_DE_NIVEL[a.nivel] - ORDEN_DE_NIVEL[b.nivel];
      if (nivel !== 0) return nivel;
      if (a.nivel === "EXPUESTO") return b.pueden.length - a.pueden.length || (b.player.marketValue ?? 0) - (a.player.marketValue ?? 0);
      if (a.nivel === "BLINDADO") return (a.blindadoHasta ?? "9999").localeCompare(b.blindadoHasta ?? "9999");
      if (a.nivel === "SEGURO") return (a.margen ?? Infinity) - (b.margen ?? Infinity);
      return 0;
    });
}

export type ResumenDeDefensa = { expuestos: number; blindados: number; seguros: number; sinClausula: number; valorExpuesto: number };

export function resumirDefensa(defensas: Defensa[]): ResumenDeDefensa {
  const resumen: ResumenDeDefensa = { expuestos: 0, blindados: 0, seguros: 0, sinClausula: 0, valorExpuesto: 0 };
  for (const d of defensas) {
    if (d.nivel === "EXPUESTO") {
      resumen.expuestos += 1;
      resumen.valorExpuesto += d.player.marketValue ?? 0;
    } else if (d.nivel === "BLINDADO") resumen.blindados += 1;
    else if (d.nivel === "SEGURO") resumen.seguros += 1;
    else resumen.sinClausula += 1;
  }
  return resumen;
}
