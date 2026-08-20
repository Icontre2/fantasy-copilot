import assert from "node:assert/strict";
import test from "node:test";
import { ACTIVITY_TYPE, automaticClauseBaseline, buildEconomy, SALDO_INICIAL, type ActivityEntry } from "./activity.ts";

const manager = (clausePlayers: { id: string; name: string; marketValue: number; buyoutClause?: number }[]) => ({
  managerId: "A",
  managerName: "Artola",
  puntos: 0,
  cajaOficial: null,
  clausePlayers,
});

function activity(overrides: Partial<ActivityEntry>): ActivityEntry {
  return {
    id: "1",
    activityTypeId: ACTIVITY_TYPE.COMPRA,
    createdAt: "2026-08-13T10:00:00+02:00",
    ...overrides,
  };
}

test("clausula por encima del suelo descuenta la mitad de la subida", () => {
  const marketValue = 10_000_000;
  const baseline = automaticClauseBaseline(marketValue);
  assert.equal(baseline, 16_600_000);

  const [economy] = buildEconomy({
    managers: [manager([{ id: "P", name: "Jugador", marketValue, buyoutClause: 36_600_000 }])],
    activity: [],
  });

  assert.equal(economy?.gastoClausulasEstimado, 10_000_000);
  assert.equal(economy?.clauseInvestments[0]?.estimatedManualIncrease, 20_000_000);
  assert.equal(economy?.cajaReconstruida, SALDO_INICIAL - 10_000_000);
});

test("un precio de compra alto actua como suelo y evita contar fichaje como blindaje", () => {
  const [economy] = buildEconomy({
    managers: [manager([{ id: "P", name: "Jugador", marketValue: 10_000_000, buyoutClause: 30_000_000 }])],
    activity: [activity({ user1Id: "A", playerMasterId: "P", amount: 30_000_000 })],
  });

  assert.equal(economy?.compras, 30_000_000);
  assert.equal(economy?.gastoClausulasEstimado, 0);
  assert.equal(economy?.cajaReconstruida, SALDO_INICIAL - 30_000_000);
});

test("si despues de comprar se eleva la clausula, solo se descuenta el exceso", () => {
  const [economy] = buildEconomy({
    managers: [manager([{ id: "P", name: "Jugador", marketValue: 10_000_000, buyoutClause: 50_000_000 }])],
    activity: [activity({ user1Id: "A", playerMasterId: "P", amount: 30_000_000 })],
  });

  assert.equal(economy?.gastoClausulasEstimado, 10_000_000);
  assert.equal(economy?.cajaReconstruida, SALDO_INICIAL - 30_000_000 - 10_000_000);
});

test("jugador sin clausula publicada no inventa gasto", () => {
  const [economy] = buildEconomy({
    managers: [manager([{ id: "P", name: "Jugador", marketValue: 10_000_000 }])],
    activity: [],
  });

  assert.equal(economy?.gastoClausulasEstimado, 0);
  assert.deepEqual(economy?.clauseInvestments, []);
});
