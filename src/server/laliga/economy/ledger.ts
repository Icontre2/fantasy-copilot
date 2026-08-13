import type { DetectedTransaction } from './transactions';
import type { PointIncomeRow } from './points';

/**
 * Libro contable por manager.
 *
 * ── La honestidad va en el tipo, no en un comentario de la UI ────────────────
 * LALIGA publica el saldo ACTUAL exacto de cada manager (`teamMoney`), tambien
 * el de los rivales. Ese es `officialBalance` y no se calcula: se lee.
 *
 * Lo que esta app aporta es el DESGLOSE: de donde sale ese dinero. Y ahi hay un
 * limite duro que no se puede tapar — el historico de operaciones no existe en
 * la API, asi que el desglose solo cubre desde la primera sincronizacion. Todo
 * lo anterior se agrupa en `openingBalance`, que es literalmente:
 *
 *     openingBalance = officialBalance - (ventas - compras + bonus por puntos)
 *
 * y significa **"el saldo que ya tenia cuando empezamos a mirar, mas cualquier
 * movimiento que no hayamos sabido explicar"**. No es un saldo inicial de liga:
 * ese dato no lo publica nadie. Se llama `openingBalance` y lleva
 * `trackedSince` al lado para que nadie lo confunda con el otro.
 *
 * Por construccion el ledger SIEMPRE cuadra con la API, porque el residuo va a
 * `openingBalance` en vez de forzarse contra las categorias conocidas. Eso hace
 * que `unattributedOperations` sea la cifra que de verdad hay que mirar para
 * saber cuanto se esta perdiendo el desglose.
 */

export type LedgerEntryKind = 'COMPRA' | 'VENTA' | 'PUNTOS';

export type LedgerEntry = {
  kind: LedgerEntryKind;
  /** ISO 8601. Ordena el extracto. */
  occurredAt: string;
  /** Positivo = entra dinero. Negativo = sale. `null` = importe desconocido. */
  amount: number | null;
  playerId?: string;
  /** La otra parte de la operacion, si la hubo. */
  counterpartyManagerId?: string;
  matchday?: number;
  points?: number;
  /** De donde sale el importe: dato oficial, calculo, o desconocido. */
  basis: string;
  transactionType?: DetectedTransaction['type'];
};

export type ManagerLedger = {
  managerId: string;
  managerName: string;
  teamId: string;

  /** DATO OFICIAL: caja publicada por LALIGA. `null` si no la publico. */
  officialBalance: number | null;

  /** CALCULO DE ESTA APP, desde `trackedSince`. */
  purchases: number;
  sales: number;
  pointsBonus: number;
  /** `sales - purchases + pointsBonus`. El movimiento neto que SI conocemos. */
  net: number;

  /**
   * Saldo previo al seguimiento mas lo no explicado. `null` si no hay
   * `officialBalance` con el que despejarlo.
   */
  openingBalance: number | null;
  /** Primera observacion de esta liga, o `null` si aun no se ha sincronizado. */
  trackedSince: string | null;

  /** Operaciones detectadas cuyo importe no se pudo atribuir. */
  unattributedOperations: number;

  entries: LedgerEntry[];
};

export type LedgerInput = {
  managers: { managerId: string; managerName: string; teamId: string; teamMoney: number | null }[];
  transactions: DetectedTransaction[];
  pointIncome: PointIncomeRow[];
  /** `capturedAt` de la foto mas antigua guardada de esta liga. */
  trackedSince: string | null;
};

function entriesFor(managerId: string, input: LedgerInput): LedgerEntry[] {
  const entries: LedgerEntry[] = [];

  for (const transaction of input.transactions) {
    const isBuyer = transaction.buyerManagerId === managerId;
    const isSeller = transaction.sellerManagerId === managerId;
    if (!isBuyer && !isSeller) continue;

    entries.push({
      kind: isBuyer ? 'COMPRA' : 'VENTA',
      occurredAt: transaction.occurredAt,
      // El signo lo pone el lado de la operacion; el importe siempre llega en
      // valor absoluto desde la deteccion.
      amount: transaction.amount === null ? null : isBuyer ? -transaction.amount : transaction.amount,
      playerId: transaction.playerId,
      counterpartyManagerId: isBuyer ? transaction.sellerManagerId : transaction.buyerManagerId,
      basis: transaction.amountBasis,
      transactionType: transaction.type,
    });
  }

  for (const income of input.pointIncome) {
    if (income.managerId !== managerId) continue;
    entries.push({
      kind: 'PUNTOS',
      // Sin fecha oficial de cierre de jornada, se ordena por numero de jornada.
      occurredAt: `jornada-${String(income.matchday).padStart(3, '0')}`,
      amount: income.amount,
      matchday: income.matchday,
      points: income.points,
      basis: 'CALCULO_100K_POR_PUNTO',
    });
  }

  return entries.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

/** Construye el ledger de todos los managers de la liga. */
export function buildLedgers(input: LedgerInput): ManagerLedger[] {
  return input.managers.map((manager) => {
    const entries = entriesFor(manager.managerId, input);

    let purchases = 0;
    let sales = 0;
    let pointsBonus = 0;
    let unattributedOperations = 0;

    for (const entry of entries) {
      if (entry.amount === null) {
        unattributedOperations += 1;
        continue;
      }
      if (entry.kind === 'COMPRA') purchases += Math.abs(entry.amount);
      else if (entry.kind === 'VENTA') sales += entry.amount;
      else pointsBonus += entry.amount;
    }

    const net = sales - purchases + pointsBonus;

    return {
      managerId: manager.managerId,
      managerName: manager.managerName,
      teamId: manager.teamId,
      officialBalance: manager.teamMoney,
      purchases,
      sales,
      pointsBonus,
      net,
      openingBalance: manager.teamMoney === null ? null : manager.teamMoney - net,
      trackedSince: input.trackedSince,
      unattributedOperations,
      entries,
    };
  });
}
