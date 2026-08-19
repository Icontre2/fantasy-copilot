import assert from "node:assert/strict";
import test from "node:test";
import { jornadasDisponibles, puntosDelOnce, puntosEnJornada } from "./jornadas.ts";
import type { PlayerWithProbability } from "./types.ts";

const jugador = (id: string, weekPoints?: { jornada: number; puntos: number }[]) =>
  ({ id, name: id, team: "X", position: "DEL", marketValue: 1, points: 0, averagePoints: 0, status: "OK", weekPoints } as unknown as PlayerWithProbability);

test("solo se ofrecen las jornadas que constan, sin inventar el calendario entero", () => {
  const players = [
    jugador("a", [{ jornada: 1, puntos: 4 }, { jornada: 2, puntos: 7 }]),
    jugador("b", [{ jornada: 2, puntos: 1 }]),
    jugador("c"),
  ];
  assert.deepEqual(jornadasDisponibles(players, null), [1, 2]);
});

test("la jornada en curso entra aunque nadie haya puntuado todavía", () => {
  assert.deepEqual(jornadasDisponibles([jugador("a", [{ jornada: 1, puntos: 4 }])], 2), [1, 2]);
  assert.deepEqual(jornadasDisponibles([jugador("a")], 3), [3]);
});

test("sin jornadas ni jornada en curso no hay nada que elegir", () => {
  assert.deepEqual(jornadasDisponibles([jugador("a")], null), []);
});

test("un jugador sin dato no cuenta como cero", () => {
  const players = [
    jugador("a", [{ jornada: 1, puntos: 5 }]),
    jugador("b", [{ jornada: 1, puntos: 0 }]),
    jugador("c"),
  ];
  assert.deepEqual(puntosDelOnce(players, 1), { total: 5, conDato: 2, de: 3 });
  assert.equal(puntosEnJornada(players[1]!, 1), 0);
  assert.equal(puntosEnJornada(players[2]!, 1), null);
});
