import assert from "node:assert/strict";
import test from "node:test";
import { dificultadPorEquipo, type PartidoConCuotas } from "./team-difficulty.ts";
import { probabilidades } from "./implied.ts";
import { FALLBACK_TEAMS } from "../laliga/teams.ts";

const ATH = FALLBACK_TEAMS["3"]!;
const BAR = FALLBACK_TEAMS["4"]!;
const RMA = FALLBACK_TEAMS["15"]!;
const GET = FALLBACK_TEAMS["9"]!;

/** Un partido con cuotas de verdad calculadas, no numeros a mano. */
function partido(
  local: typeof ATH,
  visitor: typeof ATH,
  cuotas: { local: number; empate: number; visitante: number },
  extra: Partial<PartidoConCuotas> = {},
): PartidoConCuotas {
  return {
    kickoff: "2026-08-22T19:00:00Z",
    local,
    visitor,
    localScore: null,
    visitorScore: null,
    odds: { cuotas, probabilidades: probabilidades(cuotas)!, casa: "Bet365" },
    ...extra,
  };
}

test("un partido reparte dificultad a sus DOS equipos", () => {
  // BAR muy favorito en casa contra ATH.
  const indice = dificultadPorEquipo([partido(BAR, ATH, { local: 1.3, empate: 5.5, visitante: 9 })]);

  assert.equal(indice[BAR.id]?.rivalShortName, ATH.shortName);
  assert.equal(indice[BAR.id]?.enCasa, true);
  assert.equal(indice[BAR.id]?.etiqueta, "Muy favorable");

  assert.equal(indice[ATH.id]?.rivalShortName, BAR.shortName);
  assert.equal(indice[ATH.id]?.enCasa, false);
  assert.equal(indice[ATH.id]?.etiqueta, "Muy difícil");
});

test("los dos equipos comparten las MISMAS cuotas, solo cambia a cual mirar", () => {
  const indice = dificultadPorEquipo([partido(BAR, ATH, { local: 1.3, empate: 5.5, visitante: 9 })]);
  const casa = indice[BAR.id]!;
  const fuera = indice[ATH.id]!;

  assert.deepEqual(casa.cuotas, fuera.cuotas);
  assert.equal(casa.probabilidadGanar, casa.probabilidades.local);
  assert.equal(fuera.probabilidadGanar, fuera.probabilidades.visitante);
  // Y el favorito lo es de verdad: paga menos.
  assert.ok(casa.probabilidadGanar > fuera.probabilidadGanar);
});

test("un partido igualado se llama igualado por los dos lados", () => {
  const indice = dificultadPorEquipo([partido(RMA, BAR, { local: 2.6, empate: 3.4, visitante: 2.6 })]);
  assert.equal(indice[RMA.id]?.etiqueta, "Igualado");
  assert.equal(indice[BAR.id]?.etiqueta, "Igualado");
});

test("un partido sin cuotas no deja rastro: no saber no se rellena", () => {
  const sinCuotas: PartidoConCuotas = {
    kickoff: "2026-08-22T19:00:00Z",
    local: BAR,
    visitor: ATH,
    localScore: null,
    visitorScore: null,
    odds: null,
  };
  assert.deepEqual(dificultadPorEquipo([sinCuotas]), {});
});

test("un partido con un equipo sin identificar se descarta entero", () => {
  const indice = dificultadPorEquipo([partido(BAR, ATH, { local: 2, empate: 3, visitante: 4 }, { visitor: null })]);
  // Ni siquiera el equipo que SI se conoce: sin rival no hay nada que contar.
  assert.deepEqual(indice, {});
});

test("un partido ya jugado se marca como jugado", () => {
  const indice = dificultadPorEquipo([
    partido(BAR, ATH, { local: 1.3, empate: 5.5, visitante: 9 }, { localScore: 3, visitorScore: 0 }),
  ]);
  assert.equal(indice[BAR.id]?.jugado, true);
  assert.equal(indice[ATH.id]?.jugado, true);
});

test("un 0-0 real cuenta como jugado y un partido sin empezar no", () => {
  const cero = dificultadPorEquipo([
    partido(BAR, ATH, { local: 2, empate: 3, visitante: 4 }, { localScore: 0, visitorScore: 0 }),
  ]);
  assert.equal(cero[BAR.id]?.jugado, true);

  const sinEmpezar = dificultadPorEquipo([partido(BAR, ATH, { local: 2, empate: 3, visitante: 4 })]);
  assert.equal(sinEmpezar[BAR.id]?.jugado, false);
});

test("varios partidos se indexan cada uno por sus equipos", () => {
  const indice = dificultadPorEquipo([
    partido(BAR, ATH, { local: 1.3, empate: 5.5, visitante: 9 }),
    partido(RMA, GET, { local: 1.2, empate: 6, visitante: 12 }),
  ]);
  assert.equal(Object.keys(indice).length, 4);
  assert.equal(indice[RMA.id]?.rivalShortName, GET.shortName);
});
