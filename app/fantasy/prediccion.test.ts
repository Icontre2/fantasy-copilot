import assert from "node:assert/strict";
import test from "node:test";
import { cambiosSugeridos, onceDado, onceOptimo, predecirJugadores } from "./prediccion.ts";
import type { PlayerWithProbability } from "./types.ts";

let n = 0;
const j = (position: string, averagePoints: number, over: Partial<PlayerWithProbability> = {}): PlayerWithProbability =>
  ({ id: `${position}${++n}`, name: `${position}${n}`, team: "X", position, marketValue: 1, points: 0, averagePoints, status: "ok", lineupProbability: 100, ...over }) as PlayerWithProbability;

function plantilla() {
  n = 0;
  return [
    j("POR", 5), j("POR", 2),
    j("DEF", 6), j("DEF", 5), j("DEF", 4), j("DEF", 3), j("DEF", 1),
    j("MED", 7), j("MED", 6), j("MED", 5), j("MED", 2),
    j("DEL", 9), j("DEL", 8), j("DEL", 1),
  ];
}

test("el once óptimo elige la formación que más suma y pone a los mejores de cada línea", () => {
  const once = onceOptimo(predecirJugadores(plantilla(), null))!;
  // 3-4-3 no cabe con un DEL de 1 pt mejor que 4-4-2: 3 DEF (6+5+4) + 4 MED (7+6+5+2) + 3 DEL (9+8+1) = 53 + POR 5 = 58
  // 4-4-2: 18 + 20 + 17 + 5 = 60 ; 4-3-3: 18+18+18+5 = 59 ; 5-3-2: 19+18+17+5=59 ; 3-4-3: 15+20+18+5=58
  assert.equal(once.formacion, "4-4-2");
  assert.equal(once.total, 60);
  assert.equal(once.titulares.length, 11);
});

test("descuenta el riesgo de no jugar: un suplente fijo supera a un titular dudoso", () => {
  const players = plantilla();
  players[11] = { ...players[11]!, lineupProbability: 10 }; // DEL de 9 al 10 % → 0,9, menos que el DEL de 1 fijo
  const once = onceOptimo(predecirJugadores(players, null))!;
  assert.equal(once.titulares.some((t) => t.player.id === players[11]!.id), false);
});

test("sin media publicada cuenta 0 y se cuenta aparte", () => {
  const players = plantilla().map((p) => (p.position === "POR" ? { ...p, averagePoints: Number.NaN } : p));
  const once = onceOptimo(predecirJugadores(players, null))!;
  assert.equal(once.sinDatos, 1);
});

test("una plantilla que no llena ninguna formación no se inventa un once", () => {
  assert.equal(onceOptimo(predecirJugadores([j("POR", 5), j("DEF", 5)], null)), null);
});

test("cambios sugeridos: dice quién entra y quién sale, aunque cambie la formación", () => {
  const players = plantilla();
  const predichos = predecirJugadores(players, null);
  const optimo = onceOptimo(predichos)!;
  // Once «probable» en 3-4-3: sin el DEF de 4 y con el DEL de 1
  const actualIds = optimo.titulares.map((t) => t.player.id).filter((id) => id !== "DEF5").concat("DEL14");
  const actual = onceDado("3-4-3", actualIds, predichos);
  const cambios = cambiosSugeridos(actual, optimo);
  assert.deepEqual(cambios.map((c) => [c.entra.player.id, c.sale?.player.id]), [["DEF5", "DEL14"]]);
  assert.ok(optimo.total > actual.total);
});

test("si el once probable ya es el óptimo, no hay cambios", () => {
  const predichos = predecirJugadores(plantilla(), null);
  const optimo = onceOptimo(predichos)!;
  assert.deepEqual(cambiosSugeridos(onceDado(optimo.formacion, optimo.titulares.map((t) => t.player.id), predichos), optimo), []);
});

test("cambios sugeridos: si hay uno de su línea, sale ese y no otro", () => {
  const predichos = predecirJugadores(plantilla(), null);
  const optimo = onceOptimo(predichos)!;
  // Once «probable» igual al óptimo pero con el DEF de 1 (suplente) en vez del DEF de 4
  const actualIds = optimo.titulares.map((t) => t.player.id).filter((id) => id !== "DEF5").concat("DEF7");
  const cambios = cambiosSugeridos(onceDado("4-4-2", actualIds, predichos), optimo);
  assert.deepEqual(cambios.map((c) => [c.entra.player.id, c.sale?.player.id]), [["DEF5", "DEF7"]]);
});

test("partido ya jugado con puntos publicados: cuentan los reales, no la previsión", () => {
  const players = plantilla().map((p) => ({ ...p, teamId: p.position === "DEL" ? "T1" : "T2", weekPoints: p.position === "DEL" ? [{ jornada: 6, puntos: 15 }] : [] }));
  const dificultad = {
    T1: { jugado: true, enCasa: true, probabilidadGanar: 0.5 },
    T2: { jugado: false, enCasa: true, probabilidadGanar: 0.5 },
  } as never;
  const predichos = predecirJugadores(players, dificultad, 6);
  const delantero = predichos.find((j) => j.player.position === "DEL")!;
  assert.equal(delantero.real, 15);
  assert.equal(delantero.proyeccion?.points, 15);
  const medio = predichos.find((j) => j.player.position === "MED")!;
  assert.equal(medio.real, null);
  const once = onceOptimo(predichos)!;
  assert.ok(once.yaJugaron >= 1);
});

test("partido jugado pero sin puntos publicados todavía: se sigue prediciendo", () => {
  const players = plantilla().map((p) => ({ ...p, teamId: "T1", weekPoints: [] }));
  const predichos = predecirJugadores(players, { T1: { jugado: true, enCasa: true, probabilidadGanar: 0.5 } } as never, 6);
  assert.ok(predichos.every((j) => j.real === null && j.proyeccion !== null));
});
