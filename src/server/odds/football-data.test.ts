import assert from "node:assert/strict";
import test from "node:test";
import { cuotasDeFila, equipoDe, fechaIso, interpretar, leerCsv } from "./football-data.ts";
import { FALLBACK_TEAMS } from "../laliga/teams.ts";

const EQUIPOS = Object.values(FALLBACK_TEAMS);
const corto = (nombre: string) => equipoDe(nombre, EQUIPOS)?.shortName ?? null;

/*
 * Los nombres de aqui NO son inventados: salen de los ficheros reales de
 * football-data.co.uk (temporadas 24/25 y 25/26, mas el fixtures.csv en vivo).
 */

test("los nombres de la fuente se traducen a equipos de LALIGA", () => {
  assert.equal(corto("Ath Bilbao"), "ATH");
  assert.equal(corto("Ath Madrid"), "ATM");
  assert.equal(corto("Espanol"), "ESP");
  assert.equal(corto("Dep. A Coruna"), "DEP");
  assert.equal(corto("Vallecano"), "RAY");
  assert.equal(corto("Sociedad"), "RSO");
  assert.equal(corto("Santander"), "RAC");
  assert.equal(corto("Betis"), "BET");
  assert.equal(corto("Celta"), "CEL");
  assert.equal(corto("Real Madrid"), "RMA");
  assert.equal(corto("Barcelona"), "BAR");
});

test("un equipo que no es de esta liga no se traduce a nada", () => {
  assert.equal(corto("Benfica"), null);
  assert.equal(corto("Porto"), null);
});

test("el CSV se lee con sus columnas nombradas", () => {
  const filas = leerCsv("Div,Date,HomeTeam,AwayTeam\r\nSP1,15/08/2026,Alaves,Getafe\r\n");
  assert.equal(filas.length, 1);
  assert.equal(filas[0]?.Div, "SP1");
  assert.equal(filas[0]?.HomeTeam, "Alaves");
});

test("las fechas de la fuente se convierten a ISO", () => {
  assert.equal(fechaIso("15/08/2026"), "2026-08-15");
  assert.equal(fechaIso("5/8/26"), "2026-08-05");
  assert.equal(fechaIso("manana"), null);
  assert.equal(fechaIso(""), null);
});

test("se prefiere la cuota de una casa concreta a la media", () => {
  const conBet365 = cuotasDeFila({ B365H: "2.35", B365D: "2.8", B365A: "3.75", AvgH: "2.33", AvgD: "2.82", AvgA: "3.62" });
  assert.equal(conBet365?.casa, "Bet365");
  assert.equal(conBet365?.cuotas.local, 2.35);
});

test("sin casa concreta se usa la media, y se dice que es una media", () => {
  const soloMedia = cuotasDeFila({ AvgH: "2.33", AvgD: "2.82", AvgA: "3.62" });
  assert.equal(soloMedia?.casa, "media del mercado");
  assert.equal(soloMedia?.cuotas.local, 2.33);
});

test("una fila sin ninguna cuota no produce nada", () => {
  assert.equal(cuotasDeFila({ B365H: "", AvgH: "" }), null);
});

test("un partido real del CSV sale con sus dos equipos y su probabilidad", () => {
  // Fila copiada del fixtures.csv en vivo del 16/08/2026.
  const filas = leerCsv(
    "Div,Date,Time,HomeTeam,AwayTeam,Referee,B365H,B365D,B365A\r\n" +
    "SP1,15/08/2026,18:30,Alaves,Getafe,,2.35,2.8,3.75\r\n",
  );
  const [cuota] = interpretar(filas, EQUIPOS);
  assert.equal(cuota?.localId, FALLBACK_TEAMS["21"]?.id);
  assert.equal(cuota?.visitorId, FALLBACK_TEAMS["9"]?.id);
  assert.equal(cuota?.fecha, "2026-08-15");
  assert.equal(cuota?.casa, "Bet365");
  // El local es favorito: 2,35 paga menos que 3,75.
  assert.ok(cuota!.probabilidades.local > cuota!.probabilidades.visitante);
});

test("las ligas que no son LALIGA se ignoran", () => {
  const filas = leerCsv("Div,Date,HomeTeam,AwayTeam,B365H,B365D,B365A\r\nP1,15/08/2026,Benfica,Porto,2,3,4\r\n");
  assert.deepEqual(interpretar(filas, EQUIPOS), []);
});
