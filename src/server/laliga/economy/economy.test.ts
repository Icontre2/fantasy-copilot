import assert from "node:assert/strict";
import test from "node:test";
import {
  attributePoints,
  EUROS_PER_POINT,
  totalPointIncome,
  type PointIncomeRow,
} from "./points.ts";
import {
  buildExternalId,
  detectTransactions,
  type EconomySnapshot,
  type ManagerState,
} from "./transactions.ts";
import { buildLedgers } from "./ledger.ts";

// --- Ingreso por puntos -----------------------------------------------------

test("100.000 EUR por punto: 250 puntos son 25 millones", () => {
  const row = attributePoints({
    leagueId: "L",
    managerId: "m1",
    matchday: 1,
    totalPoints: 250,
    previouslyRecorded: [],
  });

  assert.equal(row.points, 250);
  assert.equal(row.amount, 25_000_000);
});

test("re-sincronizar la misma jornada NO duplica el ingreso", () => {
  const first = attributePoints({
    leagueId: "L",
    managerId: "m1",
    matchday: 4,
    totalPoints: 58,
    previouslyRecorded: [],
  });

  // Segunda pasada: la fila de la jornada 4 ya existe y se vuelve a calcular.
  const second = attributePoints({
    leagueId: "L",
    managerId: "m1",
    matchday: 4,
    totalPoints: 58,
    previouslyRecorded: [{ matchday: 4, points: first.points }],
  });

  assert.deepEqual(second, first);
  assert.equal(second.amount, 5_800_000);
});

test("cada jornada solo recibe lo suyo, y la suma cuadra con el acumulado", () => {
  const recorded: PointIncomeRow[] = [];

  // Acumulados observados jornada a jornada.
  for (const [matchday, totalPoints] of [
    [1, 40],
    [2, 75],
    [3, 75], // jornada en blanco: 0 puntos, no un hueco
    [4, 133],
  ] as const) {
    recorded.push(
      attributePoints({
        leagueId: "L",
        managerId: "m1",
        matchday,
        totalPoints,
        previouslyRecorded: recorded,
      }),
    );
  }

  assert.deepEqual(
    recorded.map((row) => row.points),
    [40, 35, 0, 58],
  );
  // La invariante que hace imposible el doble conteo.
  assert.equal(totalPointIncome(recorded), 133 * EUROS_PER_POINT);
});

test("una correccion a la baja de LALIGA se refleja, no se recorta a cero", () => {
  const row = attributePoints({
    leagueId: "L",
    managerId: "m1",
    matchday: 2,
    totalPoints: 30,
    previouslyRecorded: [{ matchday: 1, points: 40 }],
  });

  // Recortar a 0 dejaria el total en 40 cuando la API dice 30.
  assert.equal(row.points, -10);
});

// --- Deteccion de operaciones ----------------------------------------------

function manager(overrides: Partial<ManagerState> = {}): ManagerState {
  return {
    managerId: "m1",
    managerName: "Javier",
    teamId: "t1",
    teamMoney: 10_000_000,
    teamPoints: 0,
    playerIds: [],
    ...overrides,
  };
}

function snapshot(overrides: Partial<EconomySnapshot> = {}): EconomySnapshot {
  return {
    leagueId: "L",
    capturedAt: "2026-08-13T10:00:00.000Z",
    weekNumber: 1,
    managers: [],
    marketPlayerIds: [],
    ...overrides,
  };
}

test("traspaso entre managers: importe inferido de la caja del comprador", () => {
  const previous = snapshot({
    managers: [
      manager({ managerId: "A", teamMoney: 5_000_000, playerIds: ["p1"] }),
      manager({ managerId: "B", teamMoney: 30_000_000, playerIds: [] }),
    ],
  });
  const current = snapshot({
    capturedAt: "2026-08-13T22:00:00.000Z",
    managers: [
      manager({ managerId: "A", teamMoney: 30_000_000, playerIds: [] }),
      manager({ managerId: "B", teamMoney: 5_000_000, playerIds: ["p1"] }),
    ],
  });

  const [transaction, ...rest] = detectTransactions(previous, current);

  assert.equal(rest.length, 0);
  assert.ok(transaction);
  assert.equal(transaction.type, "TRANSFER_BETWEEN_MANAGERS");
  assert.equal(transaction.sellerManagerId, "A");
  assert.equal(transaction.buyerManagerId, "B");
  assert.equal(transaction.amount, 25_000_000);
  assert.equal(transaction.amountBasis, "INFERRED_FROM_CASH_DELTA");
});

test("el ingreso por puntos se descuenta antes de inferir el importe", () => {
  const previous = snapshot({
    managers: [manager({ managerId: "A", teamMoney: 20_000_000, teamPoints: 0, playerIds: [] })],
    marketPlayerIds: ["p1"],
  });
  const current = snapshot({
    capturedAt: "2026-08-13T22:00:00.000Z",
    // Gano 58 puntos (+5,8M) y compro a p1. Caja: 20 - compra + 5,8 = 18,8M.
    managers: [manager({ managerId: "A", teamMoney: 18_800_000, teamPoints: 58, playerIds: ["p1"] })],
  });

  const [transaction] = detectTransactions(previous, current);

  assert.ok(transaction);
  assert.equal(transaction.type, "BUY_FROM_MARKET");
  // Sin descontar los puntos habria salido 1,2M en vez de los 7M reales.
  assert.equal(transaction.amount, 7_000_000);
});

test("dos operaciones del mismo manager: el importe no se reparte, se deja sin atribuir", () => {
  const previous = snapshot({
    managers: [manager({ managerId: "A", teamMoney: 40_000_000, playerIds: [] })],
    marketPlayerIds: ["p1", "p2"],
  });
  const current = snapshot({
    capturedAt: "2026-08-13T22:00:00.000Z",
    managers: [manager({ managerId: "A", teamMoney: 10_000_000, playerIds: ["p1", "p2"] })],
  });

  const transactions = detectTransactions(previous, current);

  assert.equal(transactions.length, 2);
  for (const transaction of transactions) {
    assert.equal(transaction.amount, null);
    assert.equal(transaction.amountBasis, "NOT_ATTRIBUTABLE_MULTIPLE_OPERATIONS");
  }
});

test("sin teamMoney el importe queda desconocido, y se distingue del caso anterior", () => {
  const previous = snapshot({
    managers: [manager({ managerId: "A", teamMoney: null, playerIds: [] })],
    marketPlayerIds: ["p1"],
  });
  const current = snapshot({
    capturedAt: "2026-08-13T22:00:00.000Z",
    managers: [manager({ managerId: "A", teamMoney: null, playerIds: ["p1"] })],
  });

  const [transaction] = detectTransactions(previous, current);

  assert.ok(transaction);
  assert.equal(transaction.amount, null);
  assert.equal(transaction.amountBasis, "UNKNOWN_CASH");
});

test("venta al mercado: el jugador sale y no aparece en ninguna plantilla", () => {
  const previous = snapshot({
    managers: [manager({ managerId: "A", teamMoney: 1_000_000, playerIds: ["p1"] })],
  });
  const current = snapshot({
    capturedAt: "2026-08-13T22:00:00.000Z",
    managers: [manager({ managerId: "A", teamMoney: 8_200_000, playerIds: [] })],
  });

  const [transaction] = detectTransactions(previous, current);

  assert.ok(transaction);
  assert.equal(transaction.type, "SELL_TO_MARKET");
  assert.equal(transaction.sellerManagerId, "A");
  assert.equal(transaction.buyerManagerId, undefined);
  assert.equal(transaction.amount, 7_200_000);
});

test("un jugador que aparece sin haber estado en el mercado se marca como origen desconocido", () => {
  const previous = snapshot({ managers: [manager({ managerId: "A", playerIds: [] })] });
  const current = snapshot({
    capturedAt: "2026-08-13T22:00:00.000Z",
    managers: [manager({ managerId: "A", teamMoney: 3_000_000, playerIds: ["p1"] })],
  });

  const [transaction] = detectTransactions(previous, current);

  assert.ok(transaction);
  assert.equal(transaction.type, "ACQUISITION_UNKNOWN_ORIGIN");
});

test("sin cambios de plantilla no se inventa ninguna operacion", () => {
  const managers = [manager({ managerId: "A", playerIds: ["p1", "p2"] })];
  const previous = snapshot({ managers });
  const current = snapshot({ capturedAt: "2026-08-13T22:00:00.000Z", managers });

  assert.deepEqual(detectTransactions(previous, current), []);
});

test("el externalId no cambia si se repite la sincronizacion contra la misma foto previa", () => {
  const previous = snapshot({
    managers: [
      manager({ managerId: "A", teamMoney: 5_000_000, playerIds: ["p1"] }),
      manager({ managerId: "B", teamMoney: 30_000_000, playerIds: [] }),
    ],
  });
  const build = (capturedAt: string) =>
    detectTransactions(
      previous,
      snapshot({
        capturedAt,
        managers: [
          manager({ managerId: "A", teamMoney: 30_000_000, playerIds: [] }),
          manager({ managerId: "B", teamMoney: 5_000_000, playerIds: ["p1"] }),
        ],
      }),
    );

  // Dos descargas distintas de la foto actual: la operacion es la misma.
  const [first] = build("2026-08-13T22:00:00.000Z");
  const [second] = build("2026-08-13T23:30:00.000Z");

  assert.ok(first && second);
  assert.equal(first.externalId, second.externalId);
});

test("operaciones distintas producen ids distintos", () => {
  const base = { leagueId: "L", from: "2026-08-13T10:00:00.000Z" } as const;

  const ids = new Set([
    buildExternalId({ ...base, type: "BUY_FROM_MARKET", playerId: "p1", buyerManagerId: "A" }),
    buildExternalId({ ...base, type: "BUY_FROM_MARKET", playerId: "p2", buyerManagerId: "A" }),
    buildExternalId({ ...base, type: "BUY_FROM_MARKET", playerId: "p1", buyerManagerId: "B" }),
    buildExternalId({ ...base, type: "SELL_TO_MARKET", playerId: "p1", sellerManagerId: "A" }),
  ]);

  assert.equal(ids.size, 4);
});

// --- Ledger -----------------------------------------------------------------

test("el ledger cuadra con el saldo oficial: el residuo va a openingBalance", () => {
  const [ledger] = buildLedgers({
    managers: [{ managerId: "A", managerName: "Javier", teamId: "t1", teamMoney: 12_000_000 }],
    transactions: [
      {
        externalId: "x1",
        leagueId: "L",
        type: "SELL_TO_MARKET",
        occurredAt: "2026-08-10T10:00:00.000Z",
        observedBetween: { from: "a", to: "b" },
        sellerManagerId: "A",
        playerId: "p1",
        amount: 7_200_000,
        amountBasis: "INFERRED_FROM_CASH_DELTA",
      },
      {
        externalId: "x2",
        leagueId: "L",
        type: "BUY_FROM_MARKET",
        occurredAt: "2026-08-11T10:00:00.000Z",
        observedBetween: { from: "a", to: "b" },
        buyerManagerId: "A",
        playerId: "p2",
        amount: 11_000_000,
        amountBasis: "INFERRED_FROM_CASH_DELTA",
      },
    ],
    pointIncome: [{ leagueId: "L", managerId: "A", matchday: 4, points: 58, amount: 5_800_000 }],
    trackedSince: "2026-08-09T10:00:00.000Z",
  });

  assert.ok(ledger);
  assert.equal(ledger.sales, 7_200_000);
  assert.equal(ledger.purchases, 11_000_000);
  assert.equal(ledger.pointsBonus, 5_800_000);
  assert.equal(ledger.net, 2_000_000);
  // 12.000.000 oficial - 2.000.000 explicados = 10.000.000 previos al seguimiento.
  assert.equal(ledger.openingBalance, 10_000_000);
  assert.equal(ledger.trackedSince, "2026-08-09T10:00:00.000Z");
});

test("las compras salen en negativo y las ventas en positivo, en orden cronologico", () => {
  const [ledger] = buildLedgers({
    managers: [{ managerId: "A", managerName: "Javier", teamId: "t1", teamMoney: 0 }],
    transactions: [
      {
        externalId: "x2",
        leagueId: "L",
        type: "BUY_FROM_MARKET",
        occurredAt: "2026-08-11T10:00:00.000Z",
        observedBetween: { from: "a", to: "b" },
        buyerManagerId: "A",
        playerId: "p2",
        amount: 11_000_000,
        amountBasis: "INFERRED_FROM_CASH_DELTA",
      },
      {
        externalId: "x1",
        leagueId: "L",
        type: "SELL_TO_MARKET",
        occurredAt: "2026-08-10T10:00:00.000Z",
        observedBetween: { from: "a", to: "b" },
        sellerManagerId: "A",
        playerId: "p1",
        amount: 7_200_000,
        amountBasis: "INFERRED_FROM_CASH_DELTA",
      },
    ],
    pointIncome: [],
    trackedSince: null,
  });

  assert.ok(ledger);
  assert.deepEqual(
    ledger.entries.map((entry) => [entry.kind, entry.amount]),
    [
      ["VENTA", 7_200_000],
      ["COMPRA", -11_000_000],
    ],
  );
});

test("una operacion sin importe se cuenta como no atribuida y no ensucia los totales", () => {
  const [ledger] = buildLedgers({
    managers: [{ managerId: "A", managerName: "Javier", teamId: "t1", teamMoney: 5_000_000 }],
    transactions: [
      {
        externalId: "x1",
        leagueId: "L",
        type: "BUY_FROM_MARKET",
        occurredAt: "2026-08-11T10:00:00.000Z",
        observedBetween: { from: "a", to: "b" },
        buyerManagerId: "A",
        playerId: "p1",
        amount: null,
        amountBasis: "NOT_ATTRIBUTABLE_MULTIPLE_OPERATIONS",
      },
    ],
    pointIncome: [],
    trackedSince: null,
  });

  assert.ok(ledger);
  assert.equal(ledger.purchases, 0);
  assert.equal(ledger.unattributedOperations, 1);
  // El importe desconocido no se convierte en cero euros gastados.
  assert.equal(ledger.entries[0]?.amount, null);
});

test("sin saldo oficial no se inventa un openingBalance", () => {
  const [ledger] = buildLedgers({
    managers: [{ managerId: "A", managerName: "Javier", teamId: "t1", teamMoney: null }],
    transactions: [],
    pointIncome: [],
    trackedSince: null,
  });

  assert.ok(ledger);
  assert.equal(ledger.openingBalance, null);
});
