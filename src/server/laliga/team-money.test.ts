import assert from "node:assert/strict";
import test from "node:test";
import { equiposSinCaja, mezclarCajas } from "./team-money.ts";

/*
 * La caja de los rivales salia como "—" en todas las tarjetas. El motivo no era
 * que LALIGA no la tenga, sino que solo se le habia preguntado por el endpoint
 * plural, donde no viene. Estos tests fijan la unica regla que importa al
 * mezclar la segunda consulta: rellenar huecos, jamas inventar ni pisar.
 */

const equipo = (teamId: string, teamMoney?: number) => ({ teamId, teamMoney });

test("solo se vuelve a preguntar por los equipos sin caja", () => {
  const pendientes = equiposSinCaja([equipo("1", 1_500_000), equipo("2"), equipo("3")]);
  assert.deepEqual(pendientes.map((team) => team.teamId), ["2", "3"]);
});

test("una caja de cero es un dato, no un hueco", () => {
  // Un manager arruinado tiene 0 €, y eso NO se vuelve a preguntar ni se pisa.
  assert.deepEqual(equiposSinCaja([equipo("1", 0)]), []);
});

test("la segunda consulta rellena los huecos", () => {
  const mezclado = mezclarCajas([equipo("1", 1_500_000), equipo("2")], new Map([["2", 8_300_000]]));
  assert.deepEqual(mezclado, [equipo("1", 1_500_000), equipo("2", 8_300_000)]);
});

test("nunca pisa una caja que ya conociamos", () => {
  const mezclado = mezclarCajas([equipo("1", 1_500_000)], new Map([["1", 99_000_000]]));
  assert.equal(mezclado[0]?.teamMoney, 1_500_000);
});

test("si la segunda consulta tampoco la sabe, se queda sin conocer", () => {
  const mezclado = mezclarCajas([equipo("2")], new Map([["2", undefined]]));
  assert.equal(mezclado[0]?.teamMoney, undefined);
});

test("un equipo que no vuelve en la segunda consulta se queda igual", () => {
  const mezclado = mezclarCajas([equipo("2")], new Map());
  assert.equal(mezclado[0]?.teamMoney, undefined);
});
