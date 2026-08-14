import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVITY_TYPE,
  buildEconomy,
  EUROS_POR_PUNTO,
  SALDO_INICIAL,
  type ActivityEntry,
} from "./activity.ts";

/**
 * Los casos salen de operaciones REALES de una liga, cruzadas una a una con lo
 * que muestra la app oficial de LALIGA. Los importes y las fechas son los que
 * devolvio la API el 2026-08-13.
 */

let contador = 0;
function entrada(overrides: Partial<ActivityEntry>): ActivityEntry {
  contador += 1;
  return {
    id: String(contador),
    activityTypeId: ACTIVITY_TYPE.COMPRA,
    createdAt: "2026-08-13T17:17:09+02:00",
    ...overrides,
  };
}

const manager = (managerId: string, puntos = 0, cajaOficial: number | null = null) => ({
  managerId,
  managerName: `M${managerId}`,
  puntos,
  cajaOficial,
});

test("una compra resta: «ha comprado a Ugrinic de LALIGA por 3.864.809»", () => {
  const [economy] = buildEconomy({
    managers: [manager("A")],
    activity: [entrada({ activityTypeId: ACTIVITY_TYPE.COMPRA, user1Id: "A", amount: 3_864_809 })],
  });

  assert.ok(economy);
  assert.equal(economy.compras, 3_864_809);
  assert.equal(economy.ventas, 0);
  assert.equal(economy.cajaReconstruida, SALDO_INICIAL - 3_864_809);
});

test("una venta suma: «ha vendido a Oskarsson a LALIGA por 8.316.899»", () => {
  const [economy] = buildEconomy({
    managers: [manager("A")],
    activity: [entrada({ activityTypeId: ACTIVITY_TYPE.VENTA, user1Id: "A", amount: 8_316_899 })],
  });

  assert.ok(economy);
  assert.equal(economy.ventas, 8_316_899);
  assert.equal(economy.cajaReconstruida, SALDO_INICIAL + 8_316_899);
});

test("un traspaso mueve el dinero: user1 paga y user2 cobra lo mismo", () => {
  const economies = buildEconomy({
    managers: [manager("A"), manager("B")],
    activity: [
      entrada({
        activityTypeId: ACTIVITY_TYPE.TRASPASO,
        user1Id: "A",
        user2Id: "B",
        amount: 17_500_000,
      }),
    ],
  });

  const [a, b] = economies;
  assert.ok(a && b);
  assert.equal(a.compras, 17_500_000);
  assert.equal(a.ventas, 0);
  assert.equal(b.ventas, 17_500_000);
  assert.equal(b.compras, 0);
  // El dinero se mueve: entre los dos, la liga no gana ni pierde nada.
  assert.equal(a.cajaReconstruida + b.cajaReconstruida, SALDO_INICIAL * 2);
});

test("una cláusula resta al comprador y suma al propietario anterior", () => {
  const economies = buildEconomy({
    managers: [manager("A"), manager("B")],
    activity: [
      entrada({
        activityTypeId: ACTIVITY_TYPE.CLAUSULA,
        user1Id: "A",
        user2Id: "B",
        amount: 72_100_000,
      }),
    ],
  });

  const [buyer, seller] = economies;
  assert.equal(buyer?.compras, 72_100_000);
  assert.equal(seller?.ventas, 72_100_000);
  assert.equal(buyer?.entries[0]?.kind, "CLAUSULA_PAGADA");
  assert.equal(seller?.entries[0]?.kind, "CLAUSULA_COBRADA");
});

test("un tipo no verificado se ignora en vez de asignarle un signo a ojo", () => {
  const [economy] = buildEconomy({
    managers: [manager("A")],
    // El tipo 9 aparece sin importe y no se ha podido confirmar que significa.
    activity: [entrada({ activityTypeId: 9, user1Id: "A" })],
  });

  assert.ok(economy);
  assert.equal(economy.entries.length, 0);
  assert.equal(economy.cajaReconstruida, SALDO_INICIAL);
});

test("los puntos aportan 100.000 EUR cada uno", () => {
  const [economy] = buildEconomy({ managers: [manager("A", 250)], activity: [] });

  assert.ok(economy);
  assert.equal(economy.bonusPuntos, 250 * EUROS_POR_PUNTO);
  assert.equal(economy.bonusPuntos, 25_000_000);
  assert.equal(economy.cajaReconstruida, SALDO_INICIAL + 25_000_000);
});

// --- Reconciliacion ---------------------------------------------------------

test("sin caja oficial no hay diferencia que calcular, y se dice con null", () => {
  const [economy] = buildEconomy({ managers: [manager("A")], activity: [] });

  assert.ok(economy);
  // LALIGA solo publica la caja del usuario conectado: para los rivales, null.
  assert.equal(economy.cajaOficial, null);
  assert.equal(economy.diferencia, null);
  assert.equal(economy.recompensasQueCuadrarian, null);
});

test("una diferencia multiplo de 100.000 se ofrece como dias de recompensa", () => {
  const [economy] = buildEconomy({
    managers: [manager("A", 0, SALDO_INICIAL + 1_200_000)],
    activity: [],
  });

  assert.ok(economy);
  assert.equal(economy.diferencia, 1_200_000);
  assert.equal(economy.recompensasQueCuadrarian, 12);
});

test("una diferencia que NO es multiplo de 100.000 no se disfraza de recompensas", () => {
  const [economy] = buildEconomy({
    managers: [manager("A", 0, SALDO_INICIAL + 1_234_567)],
    activity: [],
  });

  assert.ok(economy);
  assert.equal(economy.diferencia, 1_234_567);
  // Forzarla a 12,3 dias seria inventar una explicacion que no encaja.
  assert.equal(economy.recompensasQueCuadrarian, null);
});

test("una diferencia negativa tampoco se explica con recompensas", () => {
  const [economy] = buildEconomy({
    managers: [manager("A", 0, SALDO_INICIAL - 500_000)],
    activity: [],
  });

  assert.ok(economy);
  assert.equal(economy.diferencia, -500_000);
  // Las recompensas solo suman: no pueden explicar que falte dinero.
  assert.equal(economy.recompensasQueCuadrarian, null);
});

test("el libro sale ordenado cronologicamente", () => {
  const [economy] = buildEconomy({
    managers: [manager("A")],
    activity: [
      entrada({ user1Id: "A", amount: 1, createdAt: "2026-08-12T10:00:00+02:00" }),
      entrada({ user1Id: "A", amount: 2, createdAt: "2026-08-07T10:00:00+02:00" }),
      entrada({ user1Id: "A", amount: 3, createdAt: "2026-08-13T10:00:00+02:00" }),
    ],
  });

  assert.ok(economy);
  assert.deepEqual(
    economy.entries.map((entry) => entry.occurredAt.slice(0, 10)),
    ["2026-08-07", "2026-08-12", "2026-08-13"],
  );
});

test("la misma actividad repetida no duplica la caja", () => {
  const sale = entrada({ activityTypeId: ACTIVITY_TYPE.VENTA, user1Id: "A", amount: 8_316_899 });
  const [economy] = buildEconomy({ managers: [manager("A")], activity: [sale, sale] });
  assert.ok(economy);
  assert.equal(economy.ventas, 8_316_899);
  assert.equal(economy.entries.length, 1);
});

test("una operación conocida sin importe no crea un apunte de cero euros", () => {
  const [economy] = buildEconomy({
    managers: [manager("A")],
    activity: [entrada({ activityTypeId: ACTIVITY_TYPE.VENTA, user1Id: "A", amount: undefined })],
  });
  assert.ok(economy);
  assert.equal(economy.entries.length, 0);
  assert.equal(economy.cajaReconstruida, SALDO_INICIAL);
});

test("el libro resuelve el nombre del jugador cuando el catálogo lo conoce", () => {
  const [economy] = buildEconomy({
    managers: [manager("A")],
    activity: [entrada({ activityTypeId: ACTIVITY_TYPE.VENTA, user1Id: "A", playerMasterId: "2448", amount: 8_316_899 })],
    playerNames: new Map([["2448", "Oskarsson"]]),
  });
  assert.equal(economy?.entries[0]?.playerName, "Oskarsson");
});

test("el flujo conocido puede ser negativo y no se recorta a cero", () => {
  const [economy] = buildEconomy({
    managers: [manager("A")],
    activity: [entrada({ activityTypeId: ACTIVITY_TYPE.COMPRA, user1Id: "A", amount: 125_000_000 })],
  });
  assert.equal(economy?.flujoConocido, -125_000_000);
  assert.equal(economy?.cajaReconstruida, -25_000_000);
});
