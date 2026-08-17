import assert from "node:assert/strict";
import test from "node:test";
import { mensajeDeAlerta } from "./notify-message.ts";
import type { ClauseAlert } from "../laliga/alerts/clause-alerts.ts";

const BASE: ClauseAlert = {
  player: { id: "p1", name: "Rafa Mir", team: "ELC", position: "DEL", marketValue: 9_500_000, points: 30, averagePoints: 5, status: "ok" },
  owner: { teamId: "t1", managerId: "m1", managerName: "aguinacooo" },
  official: { marketValue: 9_500_000, buyoutClause: 10_000_000, isShielded: false, shieldedUntil: null, daysUntilUnshielded: null },
  calculated: { gap: 500_000, gapRatio: 0.05, valueToClauseRatio: 0.95, dailyTrend: 40_000, dailyTrendRatio: 0.004, estimatedDays: 12, historyPoints: 20, historyLatestDate: "2026-08-17", historyAgeDays: 0 },
  level: "ALTA",
  alreadyReachable: false,
};

test("un jugador propio se dice como tuyo, no con el nombre del manager", () => {
  const n = mensajeDeAlerta(BASE, true, "lg1");
  assert.match(n.cuerpo, /^Tu jugador/);
  assert.ok(!n.cuerpo.includes("aguinacooo"));
});

test("un jugador de un rival nombra a su manager", () => {
  const n = mensajeDeAlerta(BASE, false, "lg1");
  assert.match(n.cuerpo, /aguinacooo tiene a/);
});

test("solo se dicen datos oficiales y una resta, nunca una prediccion", () => {
  const n = mensajeDeAlerta(BASE, true, "lg1");
  assert.match(n.cuerpo, /10,0 M€/); // clausula: dato oficial
  assert.match(n.cuerpo, /0,5 M€/); // hueco: resta, no prediccion
  // Nada que suene a consejo o pronostico.
  for (const prohibido of [/va a subir/i, /recomendado/i, /compra/i, /puntos esperados/i]) {
    assert.ok(!prohibido.test(n.cuerpo), `el texto no debe contener: ${prohibido}`);
  }
});

test("un valor ya alcanzado se dice distinto de uno que se acerca", () => {
  const alcanzado: ClauseAlert = { ...BASE, alreadyReachable: true, calculated: { ...BASE.calculated, gap: -200_000 } };
  const n = mensajeDeAlerta(alcanzado, true, "lg1");
  assert.match(n.cuerpo, /ya iguala o supera/);
});

test("el tag agrupa por jugador y liga: una alerta mas grave sustituye a la anterior", () => {
  const n1 = mensajeDeAlerta(BASE, true, "lg1");
  const n2 = mensajeDeAlerta({ ...BASE, level: "CRITICA" }, true, "lg1");
  assert.equal(n1.tag, n2.tag);
});

test("el mismo jugador en otra liga no comparte tag", () => {
  const a = mensajeDeAlerta(BASE, true, "lg1");
  const b = mensajeDeAlerta(BASE, true, "lg2");
  assert.notEqual(a.tag, b.tag);
});

test("la url lleva a la liga y al jugador concretos", () => {
  const n = mensajeDeAlerta(BASE, true, "liga con espacios");
  assert.match(n.url, /league=liga%20con%20espacios/);
  assert.match(n.url, /player=p1/);
});
