import assert from "node:assert/strict";
import test from "node:test";
import { bestEleven, lineupRank } from "./lineup.ts";
import type { Position } from "../../domain/fantasy.ts";

const jugador = (
  id: string,
  position: Position,
  extra: { lineupProbability?: number; lineupExpectedStarter?: boolean; averagePoints?: number } = {},
) => ({ id, position, averagePoints: extra.averagePoints ?? 0, ...extra });

/** Plantilla holgada: 3 porteros, 8 defensas, 8 medios y 5 delanteros. */
function plantilla(probabilidadDe: (id: string) => number | undefined = () => undefined) {
  const bloque = (position: Position, cuantos: number, prefijo: string) =>
    Array.from({ length: cuantos }, (_, i) =>
      jugador(`${prefijo}${i}`, position, { lineupProbability: probabilidadDe(`${prefijo}${i}`) }),
    );
  return [
    ...bloque("POR", 3, "por"),
    ...bloque("DEF", 8, "def"),
    ...bloque("MED", 8, "med"),
    ...bloque("DEL", 5, "del"),
  ];
}

test("elige once jugadores y deja al resto en el banquillo", () => {
  const squad = plantilla();
  const { starters, bench } = bestEleven(squad);
  assert.equal(starters.length, 11);
  assert.equal(bench.length, squad.length - 11);
});

test("la formacion elegida es una de las validas", () => {
  const { formation } = bestEleven(plantilla());
  assert.match(formation, /^1-\d-\d-\d$/);
});

test("nadie sale a la vez de titular y de suplente", () => {
  const { starters, bench } = bestEleven(plantilla());
  const enBanquillo = new Set(bench.map((p) => p.id));
  assert.equal(starters.filter((p) => enBanquillo.has(p.id)).length, 0);
});

test("entra siempre exactamente un portero", () => {
  const { starters } = bestEleven(plantilla());
  assert.equal(starters.filter((p) => p.position === "POR").length, 1);
});

test("un titular publicado sin porcentaje pesa mas que un 50 %", () => {
  assert.ok(lineupRank(jugador("a", "DEL", { lineupExpectedStarter: true })) > lineupRank(jugador("b", "DEL", { lineupProbability: 50 })));
});

test("no saber nada de un jugador es PEOR que saber que es improbable", () => {
  // "0 %" es un dato; la ausencia de dato no puede colarse por delante de el.
  assert.ok(lineupRank(jugador("conocido", "DEL", { lineupProbability: 0 })) > lineupRank(jugador("desconocido", "DEL")));
});

test("con igual probabilidad decide la media de puntos, no el orden de llegada", () => {
  const squad = [
    ...Array.from({ length: 3 }, (_, i) => jugador(`por${i}`, "POR", { lineupProbability: 50 })),
    ...Array.from({ length: 8 }, (_, i) => jugador(`def${i}`, "DEF", { lineupProbability: 50 })),
    ...Array.from({ length: 8 }, (_, i) => jugador(`med${i}`, "MED", { lineupProbability: 50 })),
    jugador("delFlojo", "DEL", { lineupProbability: 50, averagePoints: 1 }),
    jugador("delBueno", "DEL", { lineupProbability: 50, averagePoints: 9 }),
    ...Array.from({ length: 3 }, (_, i) => jugador(`del${i}`, "DEL", { lineupProbability: 50, averagePoints: 5 })),
  ];
  const { starters } = bestEleven(squad);
  const ids = starters.map((p) => p.id);
  assert.ok(ids.includes("delBueno"));
  assert.ok(!ids.includes("delFlojo"));
});

test("una plantilla corta no inventa titulares: devuelve los que hay", () => {
  const { starters, formation } = bestEleven([jugador("por0", "POR"), jugador("def0", "DEF")]);
  assert.equal(starters.length, 2);
  assert.equal(formation, "Once probable");
});
