import assert from "node:assert/strict";
import test from "node:test";
import { parseSquadCsv } from "./csv-import.ts";

test("parses a semicolon-separated Spanish squad", () => {
  const result = parseSquadCsv(
    "Nombre;Posición;Club;Valor\nUnai Simón;POR;Athletic;12.500.000\nOihan Sancet;MED;Athletic;18.4",
  );

  assert.equal(result.delimiter, ";");
  assert.deepEqual(result.rows, [
    {
      rowNumber: 2,
      name: "Unai Simón",
      position: "GK",
      club: "Athletic",
      value: 12_500_000,
    },
    {
      rowNumber: 3,
      name: "Oihan Sancet",
      position: "MID",
      club: "Athletic",
      value: 18.4,
    },
  ]);
});

test("supports quoted commas and English headers", () => {
  const result = parseSquadCsv(
    'Player,Position,Team,Market value\n"Baena, Álex",MID,Villarreal,"27,400,000"',
  );

  assert.equal(result.rows[0].name, "Baena, Álex");
  assert.equal(result.rows[0].position, "MID");
  assert.equal(result.rows[0].value, 27_400_000);
});

test("rejects a file without a player header", () => {
  assert.throws(
    () => parseSquadCsv("Equipo;Posición\nAthletic;DEF"),
    /Falta la columna de jugador/,
  );
});

test("keeps unknown positions reviewable", () => {
  const result = parseSquadCsv("Jugador;Posición\nJugador prueba;LATERAL");
  assert.equal(result.rows[0].position, null);
  assert.equal(result.warnings.length, 1);
});
