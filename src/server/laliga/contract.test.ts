import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  apiCalendarSchema,
  apiMarketValueHistorySchema,
  apiPlayerDetailSchema,
  apiPlayersSchema,
  apiWeekSchema,
} from "./schemas.ts";
import { desglosar } from "./player-breakdown.ts";

/*
 * Pruebas de contrato: respuestas REALES de LALIGA (recortadas) guardadas en
 * `fixtures/`, capturadas el 2026-10-12. Si un esquema deja de aceptarlas es que
 * hemos roto algo nosotros; si LALIGA cambia el formato, se actualiza la
 * fixture con una respuesta nueva y este test dice exactamente qué campo cambió.
 */
const fixture = (nombre: string): unknown =>
  JSON.parse(readFileSync(new URL(`./fixtures/${nombre}`, import.meta.url), "utf8"));

test("contrato: catálogo /players, con números que llegan como texto", () => {
  const jugadores = apiPlayersSchema.parse(fixture("players.json"));
  assert.equal(jugadores.length, 4);
  // `marketValue` viene como string en este endpoint y debe quedar en número.
  assert.equal(typeof jugadores[0]!.marketValue, "number");
  assert.ok(jugadores.some((j) => j.playerStatus === "out_of_league"));
});

test("contrato: ficha /player/{id}, con números de verdad y el desglose por métrica", () => {
  const detalle = apiPlayerDetailSchema.parse(fixture("player-detail.json"));
  assert.equal(detalle.id, "2443");
  assert.ok(detalle.playerStats.length > 0);
  const semana = detalle.playerStats[0]!;
  // Cada métrica es [valor, puntos].
  assert.equal(semana.stats.mins_played?.length, 2);
});

test("contrato: en la ficha real, la suma de métricas da exactamente los puntos de cada jornada", () => {
  const detalle = apiPlayerDetailSchema.parse(fixture("player-detail.json"));
  const desglose = desglosar(detalle.playerStats);
  for (const jornada of desglose.jornadas) assert.equal(jornada.sinDesglosar, 0, `J${jornada.jornada}`);
});

test("contrato: histórico de cotización", () => {
  const serie = apiMarketValueHistorySchema.parse(fixture("market-value.json"));
  assert.equal(serie.length, 5);
  assert.equal(typeof serie[0]!.marketValue, "number");
});

test("contrato: calendario con ids numéricos que se normalizan a texto", () => {
  const partidos = apiCalendarSchema.parse(fixture("calendar.json"));
  assert.equal(typeof partidos[0]!.localId, "string");
  assert.equal(typeof partidos[0]!.localScore, "number");
});

test("contrato: jornada actual", () => {
  const semana = apiWeekSchema.parse(fixture("week-current.json"));
  assert.equal(typeof semana.weekNumber, "number");
  assert.equal(typeof semana.isLive, "boolean");
});
