import assert from "node:assert/strict";
import test from "node:test";
import { resolveTeamId, shortTeamName } from "./player-team.ts";

/*
 * Estos tests existen por un fallo real, no por completar la cobertura.
 *
 * LALIGA manda el equipo del jugador de dos formas segun el endpoint. El codigo
 * solo leia una, asi que en la practica los jugadores salian sin equipo y la
 * pantalla de plantilla se quedaba sin porcentajes de titularidad — que se
 * buscan por equipo. Comprobado contra el catalogo publico real: 792 jugadores,
 * cero con la forma anidada, todos con la plana.
 */

test("lee el equipo cuando viene anidado", () => {
  assert.equal(resolveTeamId("1", undefined), "1");
});

test("lee el equipo cuando viene plano", () => {
  assert.equal(resolveTeamId(undefined, "9"), "9");
});

test("con las dos formas presentes manda la anidada", () => {
  assert.equal(resolveTeamId("1", "9"), "1");
});

test("sin ninguna de las dos, no hay equipo", () => {
  assert.equal(resolveTeamId(undefined, undefined), undefined);
});

test("un id conocido da la abreviatura oficial sin necesitar el nombre", () => {
  // '4' es el Barcelona en el mapa de LALIGA. El mapa NO empieza en 1.
  assert.equal(shortTeamName("4", undefined), "BAR");
});

test("sin id ni nombre se dice que no se sabe, no se inventan siglas", () => {
  assert.equal(shortTeamName(undefined, undefined), "—");
});

test("sin id conocido, la abreviatura sale del nombre y sin el prefijo del club", () => {
  assert.equal(shortTeamName("id-que-no-existe", "FC Barcelona"), "BAR");
});
