import assert from "node:assert/strict";
import test from "node:test";
import { escapeCell, exportFilename, toCsv, type CsvColumn } from "./csv.ts";

type Row = { name: string; value: number | undefined; flag?: boolean };

const columns: CsvColumn<Row>[] = [
  { header: "name", value: (row) => row.name },
  { header: "value", value: (row) => row.value },
  { header: "flag", value: (row) => row.flag },
];

test("un dato ausente se escribe como celda vacia, nunca como cero", () => {
  const csv = toCsv([{ name: "Sancet", value: undefined }], columns);

  assert.equal(csv, "name;value;flag\nSancet;;\n");
  assert.ok(!csv.includes("0"));
});

test("NaN e Infinity se tratan como dato ausente, no como numero", () => {
  const csv = toCsv(
    [
      { name: "nan", value: Number.NaN },
      { name: "inf", value: Number.POSITIVE_INFINITY },
    ],
    columns,
  );

  assert.equal(csv, "name;value;flag\nnan;;\ninf;;\n");
});

test("escapa separadores, comillas y saltos de linea", () => {
  assert.equal(escapeCell("sin nada"), "sin nada");
  assert.equal(escapeCell("Gomez; Juan"), '"Gomez; Juan"');
  assert.equal(escapeCell('dice "hola"'), '"dice ""hola"""');
  assert.equal(escapeCell("dos\nlineas"), '"dos\nlineas"');
});

test("un nombre con punto y coma no rompe el numero de columnas", () => {
  const csv = toCsv([{ name: "Perez; Ana", value: 10 }], columns);
  const [, dataLine] = csv.trimEnd().split("\n");

  assert.equal(dataLine, '"Perez; Ana";10;');
});

test("los booleanos salen legibles en castellano", () => {
  const csv = toCsv([{ name: "x", value: 1, flag: true }], columns);
  assert.ok(csv.endsWith("x;1;si\n"));
});

test("el nombre de fichero sanea el leagueId que viene de la URL", () => {
  const now = new Date("2026-08-13T10:00:00Z");

  assert.equal(exportFilename("equipos_liga", "0123456", now), "equipos_liga_0123456_2026-08-13.csv");
  // Sin esto, un leagueId hostil podria inyectar comillas en Content-Disposition.
  assert.equal(exportFilename("mercado", '../../etc"x', now), "mercado_etcx_2026-08-13.csv");
  assert.equal(exportFilename("mercado", "!!!", now), "mercado_liga_2026-08-13.csv");
});
