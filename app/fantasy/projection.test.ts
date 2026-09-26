import assert from "node:assert/strict";
import test from "node:test";
import { projectPlayerPoints } from "./projection.ts";
import type { DificultadDeEquipo } from "./difficulty";
import type { PlayerWithProbability } from "./types.ts";

const jugador = (over: Partial<PlayerWithProbability> = {}): PlayerWithProbability =>
  ({ id: "1", name: "X", team: "BAR", position: "MED", marketValue: 1, points: 0, averagePoints: 6, status: "ok", ...over }) as PlayerWithProbability;

const partido = (enCasa: boolean, probabilidadGanar: number) => ({ enCasa, probabilidadGanar }) as DificultadDeEquipo;

test("lesionado, sancionado o fuera de la liga: cero puntos, y dice por qué", () => {
  for (const [status, motivo] of [["injured", "Lesionado"], ["suspended", "Sancionado"], ["out_of_league", "Fuera de la liga"]] as const) {
    const p = projectPlayerPoints(jugador({ status }))!;
    assert.equal(p.points, 0, status);
    assert.equal(p.high, 0, status);
    assert.deepEqual(p.factors, [motivo]);
  }
});

test("lesionado cuenta cero aunque FútbolFantasy no publique nada de él", () => {
  assert.equal(projectPlayerPoints(jugador({ status: "injured", lineupProbability: undefined }))?.points, 0);
});

test("en duda sin probabilidad publicada: la mitad", () => {
  const sano = projectPlayerPoints(jugador())!.points;
  const duda = projectPlayerPoints(jugador({ status: "doubtful" }))!;
  assert.equal(duda.points, Math.round(sano * 0.5 * 10) / 10);
  assert.ok(duda.factors.includes("En duda"));
});

test("en duda CON probabilidad: manda la probabilidad, sin castigo doble", () => {
  const conProb = projectPlayerPoints(jugador({ status: "doubtful", lineupProbability: 60 }))!.points;
  const sanoConProb = projectPlayerPoints(jugador({ lineupProbability: 60 }))!.points;
  assert.equal(conProb, sanoConProb);
});

test("la probabilidad de titular descuenta: al 50 % vale la mitad que al 100 %", () => {
  const cien = projectPlayerPoints(jugador({ lineupProbability: 100 }))!.points;
  const cincuenta = projectPlayerPoints(jugador({ lineupProbability: 50 }))!.points;
  assert.equal(cincuenta, Math.round(cien * 0.5 * 10) / 10);
});

test("en casa y favorito suma más que fuera y con el partido en contra", () => {
  const favorable = projectPlayerPoints(jugador({ lineupProbability: 100 }), partido(true, 0.7))!.points;
  const desfavorable = projectPlayerPoints(jugador({ lineupProbability: 100 }), partido(false, 0.2))!.points;
  assert.ok(favorable > desfavorable);
});

test("sin media publicada no se predice", () => {
  assert.equal(projectPlayerPoints(jugador({ averagePoints: Number.NaN })), null);
});
