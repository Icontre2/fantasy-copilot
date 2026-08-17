import assert from "node:assert/strict";
import test from "node:test";
import { diferenciarAlertas, type EstadoAlertas } from "./notify-diff.ts";
import type { AlertLevel, ClauseAlert } from "../laliga/alerts/clause-alerts.ts";

function alerta(playerId: string, level: AlertLevel): ClauseAlert {
  return {
    player: { id: playerId, name: `Jugador ${playerId}`, team: "SEV", position: "DEL", marketValue: 10_000_000, points: 30, averagePoints: 5, status: "ok" },
    owner: { teamId: "t1", managerId: "m1", managerName: "Alguien" },
    official: { marketValue: 10_000_000, buyoutClause: 11_000_000, isShielded: false, shieldedUntil: null, daysUntilUnshielded: null },
    calculated: {
      gap: 1_000_000, gapRatio: 0.09, valueToClauseRatio: 0.91, dailyTrend: 50_000, dailyTrendRatio: 0.005,
      estimatedDays: 20, historyPoints: 30, historyLatestDate: "2026-08-17", historyAgeDays: 0,
    },
    level,
    alreadyReachable: false,
  };
}

const VACIO: EstadoAlertas = new Map();

test("una alerta que aparece por primera vez se avisa", () => {
  const { aAvisar, estadoNuevo } = diferenciarAlertas(VACIO, [alerta("p1", "MEDIA")]);
  assert.equal(aAvisar.length, 1);
  assert.equal(aAvisar[0]?.nivelAnterior, null);
  assert.equal(estadoNuevo.get("p1"), "MEDIA");
});

test("EL caso: la misma alerta, mismo nivel, NO se repite", () => {
  const anterior: EstadoAlertas = new Map([["p1", "MEDIA"]]);
  const { aAvisar } = diferenciarAlertas(anterior, [alerta("p1", "MEDIA")]);
  assert.equal(aAvisar.length, 0);
});

test("si empeora (sube de nivel) se avisa otra vez", () => {
  const anterior: EstadoAlertas = new Map([["p1", "MEDIA"]]);
  const { aAvisar } = diferenciarAlertas(anterior, [alerta("p1", "CRITICA")]);
  assert.equal(aAvisar.length, 1);
  assert.equal(aAvisar[0]?.nivelAnterior, "MEDIA");
  assert.equal(aAvisar[0]?.alert.level, "CRITICA");
});

test("si mejora (baja de nivel) NO se avisa, pero el estado se actualiza igual", () => {
  const anterior: EstadoAlertas = new Map([["p1", "CRITICA"]]);
  const { aAvisar, estadoNuevo } = diferenciarAlertas(anterior, [alerta("p1", "MEDIA")]);
  assert.equal(aAvisar.length, 0);
  // Si luego vuelve a subir a CRITICA, tiene que poder avisar otra vez: por eso
  // el estado se actualiza aunque no toque avisar ahora.
  assert.equal(estadoNuevo.get("p1"), "MEDIA");
});

test("un jugador que ya no aparece desaparece del estado sin generar aviso", () => {
  const anterior: EstadoAlertas = new Map([["p1", "ALTA"], ["p2", "MEDIA"]]);
  const { aAvisar, estadoNuevo } = diferenciarAlertas(anterior, [alerta("p2", "MEDIA")]);
  assert.equal(aAvisar.length, 0);
  assert.equal(estadoNuevo.has("p1"), false);
  assert.equal(estadoNuevo.size, 1);
});

test("varios jugadores se tratan cada uno por su cuenta", () => {
  const anterior: EstadoAlertas = new Map([["p1", "MEDIA"], ["p2", "CRITICA"]]);
  const { aAvisar, estadoNuevo } = diferenciarAlertas(anterior, [
    alerta("p1", "ALTA"), // empeora -> avisa
    alerta("p2", "ALTA"), // mejora -> no avisa
    alerta("p3", "INFORMATIVA"), // nueva -> avisa
  ]);
  const avisados = aAvisar.map((c) => c.alert.player.id).sort();
  assert.deepEqual(avisados, ["p1", "p3"]);
  assert.equal(estadoNuevo.size, 3);
});

test("una lista vacia de alertas deja el estado vacio, sin avisos", () => {
  const anterior: EstadoAlertas = new Map([["p1", "CRITICA"]]);
  const { aAvisar, estadoNuevo } = diferenciarAlertas(anterior, []);
  assert.equal(aAvisar.length, 0);
  assert.equal(estadoNuevo.size, 0);
});
