/**
 * Actividad económica de la liga: el libro de operaciones que LALIGA sí publica.
 *
 * ── Por qué esto cambia el proyecto ──────────────────────────────────────────
 * Hasta ahora la contabilidad se apoyaba en comparar fotos consecutivas de la
 * liga e INFERIR los importes de la variación de caja, con la limitación de que
 * solo eran atribuibles si el manager había hecho una única operación entre dos
 * capturas. Esa premisa venía de la documentación del proyecto de referencia
 * («LALIGA no publica historial de operaciones») y **es falsa**.
 *
 * `GET /leagues/{id}/activity` devuelve las operaciones con su importe exacto,
 * su fecha y los managers implicados. Los importes dejan de ser deducidos y
 * pasan a ser publicados.
 *
 * ── Cómo se averiguó qué significa cada código ───────────────────────────────
 * `activityTypeId` es un número sin documentar. NO se ha adivinado: se cruzaron
 * las entradas de una liga real con lo que muestra la sección Actividad de la
 * app oficial, entrada por entrada (2026-08-13).
 *
 * | id | Evidencia en la app oficial | Efecto en la caja |
 * | -- | --- | --- |
 * | 31 | «El Fenómeno ha **comprado** al jugador Ugrinic de LALIGA por 3.864.809 €» | resta al comprador |
 * | 33 | «GonzaloLecanda ha **vendido** al jugador Oskarsson a LALIGA por 8.316.899 €» | suma al vendedor |
 * | 1  | Traspaso entre managers, confirmado por el usuario: pagó él, cobró el otro | resta a `user1`, suma a `user2` |
 * | 9  | Aparece sin `amount` | ninguno |
 *
 * Se comprobaron tres ejemplos de cada uno de los dos tipos frecuentes, y los
 * tres coincidieron. Un tipo desconocido **no se interpreta**: se cuenta aparte
 * para que la diferencia lo delate, en vez de asignarle un signo por intuición.
 */

/** Saldo con el que arranca cada manager la competición. */
export const SALDO_INICIAL = 100_000_000;

/** Cada punto Fantasy conseguido aporta esta cantidad. */
export const EUROS_POR_PUNTO = 100_000;

/** Importe de la recompensa diaria que puede reclamarse. */
export const RECOMPENSA_DIARIA = 100_000;

/** Códigos verificados contra la app oficial. Ver la tabla de arriba. */
export const ACTIVITY_TYPE = {
  /** Traspaso entre dos managers: `user1` paga, `user2` cobra. */
  TRASPASO: 1,
  /** Compra al mercado de LALIGA. */
  COMPRA: 31,
  /** Venta al mercado de LALIGA. */
  VENTA: 33,
} as const;

export type ActivityEntry = {
  id: string;
  activityTypeId: number;
  /** Protagonista. En un traspaso, quien PAGA. */
  user1Id?: string;
  /** Solo en traspasos: quien COBRA. */
  user2Id?: string;
  playerMasterId?: string;
  /** Importe en euros. Publicado por LALIGA, no inferido. */
  amount?: number;
  createdAt: string;
};

/** Un apunte del libro de un manager. Positivo entra, negativo sale. */
export type LedgerEntry = {
  activityId: string;
  occurredAt: string;
  kind: 'COMPRA' | 'VENTA' | 'TRASPASO_PAGADO' | 'TRASPASO_COBRADO';
  amount: number;
  playerId?: string;
  playerName?: string;
  /** El otro manager, en un traspaso. */
  counterpartyId?: string;
};

export type ManagerEconomy = {
  managerId: string;
  managerName: string;

  /** Punto de partida de la competición, igual para todos. */
  saldoInicial: number;
  /** Suma de lo gastado en compras y traspasos pagados. */
  compras: number;
  /** Suma de lo ingresado por ventas y traspasos cobrados. */
  ventas: number;
  puntos: number;
  /** `puntos * 100.000`. */
  bonusPuntos: number;

  /** `inicial - compras + ventas + bonus`. Lo que sabemos explicar. */
  cajaReconstruida: number;
  /** DATO OFICIAL de LALIGA. `null` si no lo publica (solo lo da del usuario). */
  cajaOficial: number | null;
  /**
   * `oficial - reconstruida`. `null` si no hay saldo oficial con el que comparar.
   *
   * No es un error a esconder: es la parte que la actividad disponible no
   * explica — recompensas diarias reclamadas, operaciones anteriores al inicio
   * del histórico, o cualquier movimiento que LALIGA no publique.
   */
  diferencia: number | null;
  /**
   * Días de recompensa que explicarían la diferencia, si es positiva y múltiplo
   * exacto de 100.000. `null` en cualquier otro caso: es una lectura posible de
   * la diferencia, no un dato, y solo se ofrece cuando encaja sin forzarla.
   */
  recompensasQueCuadrarian: number | null;

  entries: LedgerEntry[];
};

/** Convierte una entrada cruda en los apuntes que genera, uno por manager afectado. */
function toLedgerEntries(entry: ActivityEntry): { managerId: string; entry: LedgerEntry }[] {
  const amount = entry.amount ?? 0;
  const base = { activityId: entry.id, occurredAt: entry.createdAt, playerId: entry.playerMasterId };

  if (entry.activityTypeId === ACTIVITY_TYPE.COMPRA && entry.user1Id) {
    return [{ managerId: entry.user1Id, entry: { ...base, kind: 'COMPRA', amount: -amount } }];
  }
  if (entry.activityTypeId === ACTIVITY_TYPE.VENTA && entry.user1Id) {
    return [{ managerId: entry.user1Id, entry: { ...base, kind: 'VENTA', amount } }];
  }
  if (entry.activityTypeId === ACTIVITY_TYPE.TRASPASO && entry.user1Id && entry.user2Id) {
    // Una sola operación con dos apuntes enfrentados: el dinero se mueve, no
    // aparece ni desaparece. Contarla dos veces en el mismo manager la duplicaria.
    return [
      {
        managerId: entry.user1Id,
        entry: { ...base, kind: 'TRASPASO_PAGADO', amount: -amount, counterpartyId: entry.user2Id },
      },
      {
        managerId: entry.user2Id,
        entry: { ...base, kind: 'TRASPASO_COBRADO', amount, counterpartyId: entry.user1Id },
      },
    ];
  }
  // Tipo no verificado (por ejemplo el 9, sin importe): no se interpreta.
  return [];
}

export type BuildInput = {
  managers: { managerId: string; managerName: string; puntos: number; cajaOficial: number | null }[];
  activity: ActivityEntry[];
  playerNames?: ReadonlyMap<string, string>;
};

/**
 * Libro de cada manager a partir de la actividad publicada.
 *
 * Puro: sin red ni base de datos. Todo lo que devuelve sale de sumar apuntes
 * con signo sobre un saldo inicial conocido.
 */
export function buildEconomy(input: BuildInput): ManagerEconomy[] {
  const porManager = new Map<string, LedgerEntry[]>();
  const seen = new Set<string>();
  for (const raw of input.activity) {
    if (seen.has(raw.id)) continue;
    seen.add(raw.id);
    if (raw.amount !== undefined && (!Number.isSafeInteger(raw.amount) || raw.amount <= 0)) continue;
    for (const { managerId, entry } of toLedgerEntries(raw)) {
      if (entry.amount === 0) continue;
      if (entry.playerId) entry.playerName = input.playerNames?.get(entry.playerId);
      const list = porManager.get(managerId) ?? [];
      list.push(entry);
      porManager.set(managerId, list);
    }
  }

  return input.managers.map((manager) => {
    const entries = (porManager.get(manager.managerId) ?? []).sort((a, b) =>
      a.occurredAt.localeCompare(b.occurredAt),
    );

    const compras = entries
      .filter((entry) => entry.amount < 0)
      .reduce((total, entry) => total - entry.amount, 0);
    const ventas = entries
      .filter((entry) => entry.amount > 0)
      .reduce((total, entry) => total + entry.amount, 0);

    const bonusPuntos = manager.puntos * EUROS_POR_PUNTO;
    const cajaReconstruida = SALDO_INICIAL - compras + ventas + bonusPuntos;
    const diferencia = manager.cajaOficial === null ? null : manager.cajaOficial - cajaReconstruida;

    const recompensasQueCuadrarian =
      diferencia !== null && diferencia > 0 && diferencia % RECOMPENSA_DIARIA === 0
        ? diferencia / RECOMPENSA_DIARIA
        : null;

    return {
      managerId: manager.managerId,
      managerName: manager.managerName,
      saldoInicial: SALDO_INICIAL,
      compras,
      ventas,
      puntos: manager.puntos,
      bonusPuntos,
      cajaReconstruida,
      cajaOficial: manager.cajaOficial,
      diferencia,
      recompensasQueCuadrarian,
      entries,
    };
  });
}
