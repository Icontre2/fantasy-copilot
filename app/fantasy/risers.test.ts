import assert from "node:assert/strict";
import test from "node:test";
import { conteoPorPosicion, ordenarSubidas } from "./risers.ts";
import type { ClauseAlert } from "./types.ts";

/**
 * El orden por euros y el orden por porcentaje NO son el mismo ranking, y ese
 * es el motivo de que existan los dos. Un jugador caro que sube 300k/día mueve
 * más dinero; uno barato que sube 80k/día se revaloriza más deprisa. Estos
 * tests fijan esa diferencia para que nadie la «simplifique» a un solo orden.
 */

function alerta(over: {
  name: string;
  position?: string;
  team?: string;
  manager?: string;
  value?: number;
  trend?: number | null;
}): ClauseAlert {
  const value = over.value ?? 10_000_000;
  const trend = over.trend === undefined ? 100_000 : over.trend;
  return {
    player: {
      id: over.name, name: over.name, team: over.team ?? "RMA",
      position: (over.position ?? "DEL") as never, marketValue: value,
      points: 0, averagePoints: 0, status: "ok",
    },
    owner: { teamId: "t", managerId: "m", managerName: over.manager ?? "Ana" },
    official: { marketValue: value, buyoutClause: value * 2, isShielded: false, shieldedUntil: null, daysUntilUnshielded: null },
    calculated: {
      gap: value, gapRatio: 0.5, valueToClauseRatio: 0.5,
      dailyTrend: trend,
      dailyTrendRatio: trend === null ? null : trend / value,
      estimatedDays: null, historyPoints: 5, historyLatestDate: null, historyAgeDays: 0,
    },
    level: "INFORMATIVA",
    alreadyReachable: false,
  } as ClauseAlert;
}

const CARO = alerta({ name: "Caro", value: 30_000_000, trend: 300_000 });   // 1,0 %/día
const BARATO = alerta({ name: "Barato", value: 2_000_000, trend: 80_000 }); //   4 %/día

test("por euros gana quien más dinero sube; por porcentaje, quien más se revaloriza", () => {
  const porEuros = ordenarSubidas({ alerts: [BARATO, CARO], orden: "EUROS", posicion: "TODAS" });
  assert.deepEqual(porEuros.filas.map((f) => f.alert.player.name), ["Caro", "Barato"]);

  const porPorcentaje = ordenarSubidas({ alerts: [CARO, BARATO], orden: "PORCENTAJE", posicion: "TODAS" });
  assert.deepEqual(porPorcentaje.filas.map((f) => f.alert.player.name), ["Barato", "Caro"]);
});

test("sin tendencia no se inventa un cero: el jugador se cuenta aparte", () => {
  const { filas, sinTendencia } = ordenarSubidas({
    alerts: [CARO, alerta({ name: "SinHistorico", trend: null })],
    orden: "EUROS", posicion: "TODAS",
  });
  assert.deepEqual(filas.map((f) => f.alert.player.name), ["Caro"]);
  assert.equal(sinTendencia, 1, "«no lo sabemos» no es «no se mueve»");
});

test("las bajadas quedan fuera salvo que se pidan", () => {
  const alerts = [CARO, alerta({ name: "Baja", trend: -50_000 }), alerta({ name: "Plano", trend: 0 })];

  const soloSubidas = ordenarSubidas({ alerts, orden: "EUROS", posicion: "TODAS" });
  assert.deepEqual(soloSubidas.filas.map((f) => f.alert.player.name), ["Caro"]);

  const conBajadas = ordenarSubidas({ alerts, orden: "EUROS", posicion: "TODAS", incluirBajadas: true });
  assert.deepEqual(conBajadas.filas.map((f) => f.alert.player.name), ["Caro", "Plano", "Baja"]);
});

test("el filtro de posición no toca el resto de criterios", () => {
  const alerts = [
    alerta({ name: "Portero", position: "POR", trend: 500_000 }),
    alerta({ name: "Delantero", position: "DEL", trend: 100_000 }),
  ];
  const { filas } = ordenarSubidas({ alerts, orden: "EUROS", posicion: "DEL" });
  assert.deepEqual(filas.map((f) => f.alert.player.name), ["Delantero"]);
});

test("la búsqueda mira nombre, equipo y manager", () => {
  const alerts = [
    alerta({ name: "Uno", team: "BAR", manager: "Ana" }),
    alerta({ name: "Dos", team: "RMA", manager: "Bea" }),
  ];
  for (const [busqueda, esperado] of [["bar", "Uno"], ["bea", "Dos"], ["uno", "Uno"]] as const) {
    const { filas } = ordenarSubidas({ alerts, orden: "EUROS", posicion: "TODAS", busqueda });
    assert.deepEqual(filas.map((f) => f.alert.player.name), [esperado], `búsqueda «${busqueda}»`);
  }
});

test("a igualdad de subida, orden alfabético estable", () => {
  const alerts = [alerta({ name: "Zoe", trend: 100_000 }), alerta({ name: "Alba", trend: 100_000 })];
  const { filas } = ordenarSubidas({ alerts, orden: "EUROS", posicion: "TODAS" });
  assert.deepEqual(filas.map((f) => f.alert.player.name), ["Alba", "Zoe"]);
});

test("el conteo por posición permite desactivar un filtro vacío", () => {
  const conteo = conteoPorPosicion([
    alerta({ name: "A", position: "DEF" }),
    alerta({ name: "B", position: "DEF" }),
    alerta({ name: "C", position: "MED" }),
  ]);
  assert.equal(conteo.TODAS, 3);
  assert.equal(conteo.DEF, 2);
  assert.equal(conteo.MED, 1);
  assert.equal(conteo.POR, 0, "sin porteros, el chip se puede desactivar en vez de dar una lista vacía");
});
