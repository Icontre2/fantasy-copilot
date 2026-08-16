import assert from "node:assert/strict";
import test from "node:test";
import { emparejar, normalizar } from "./match-teams.ts";
import { FALLBACK_TEAMS } from "../laliga/teams.ts";

/*
 * El cruce de nombres es la pieza peligrosa: si se equivoca, la app enseña las
 * cuotas de otro partido y eso no se nota mirando. Estos tests usan los nombres
 * REALES del mapa de LALIGA y las grafias que suelen usar las casas inglesas.
 */

const EQUIPOS = Object.values(FALLBACK_TEAMS);
const id = (nombreCasa: string) => emparejar(nombreCasa, EQUIPOS)?.shortName ?? null;

test("acierta las grafias tipicas de una casa de apuestas", () => {
  assert.equal(id("Athletic Bilbao"), "ATH");
  assert.equal(id("Atletico Madrid"), "ATM");
  assert.equal(id("Barcelona"), "BAR");
  assert.equal(id("Real Madrid"), "RMA");
  assert.equal(id("Real Sociedad"), "RSO");
  assert.equal(id("Celta Vigo"), "CEL");
  assert.equal(id("Getafe"), "GET");
  assert.equal(id("Villarreal"), "VIL");
  assert.equal(id("Sevilla"), "SEV");
  assert.equal(id("Osasuna"), "OSA");
});

test("los acentos y los sufijos del club no estorban", () => {
  assert.equal(id("Atlético de Madrid"), "ATM");
  assert.equal(id("Elche C.F."), "ELC");
  assert.equal(id("Deportivo Alavés"), "ALA");
});

test("un equipo que no es de esta liga no se empareja con nadie", () => {
  assert.equal(id("Manchester United"), null);
  assert.equal(id("Bayern Munich"), null);
});

test("un nombre vacio o ilegible no empareja", () => {
  assert.equal(id(""), null);
  assert.equal(id("---"), null);
});

test("los sufijos del club se ignoran pero \"Real\" no", () => {
  // "Real" parece relleno y no lo es: sin ella, Real Madrid se queda en
  // "madrid" y encaja dentro de "Atletico Madrid".
  assert.deepEqual(normalizar("FC de CD"), []);
  assert.deepEqual(normalizar("Real Madrid"), ["real", "madrid"]);
  // Una palabra que la llevan cuatro clubes no puede decidir por si sola.
  assert.equal(id("Real"), null);
});

test("un derbi de la misma ciudad no se confunde", () => {
  // El caso que rompio la primera version.
  assert.equal(id("Atletico Madrid"), "ATM");
  assert.equal(id("Real Madrid"), "RMA");
});

test("ningun equipo de la liga se empareja con OTRO equipo de la liga", () => {
  // El test que de verdad importa: recorrer los veinte y comprobar que cada
  // nombre solo se reconoce a si mismo.
  for (const equipo of EQUIPOS) {
    const encontrado = emparejar(equipo.name, EQUIPOS);
    assert.ok(encontrado === null || encontrado.id === equipo.id,
      `"${equipo.name}" se emparejo con "${encontrado?.name}"`);
  }
});
