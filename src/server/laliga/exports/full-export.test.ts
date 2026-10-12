import assert from "node:assert/strict";
import test from "node:test";
import { buildFullCsv, buildFullExportRows } from "./full-export.ts";
import type { LeagueTeam, MarketEntry, Player, StandingRow } from "../../../domain/fantasy.ts";

const jugador = (id: string, extra: Partial<Player> = {}): Player => ({
  id, name: `J${id}`, team: "ATH", teamId: "3", position: "DEF", marketValue: 10_000_000,
  points: 20, averagePoints: 4, status: "ok", weekPoints: [{ jornada: 1, puntos: 8 }, { jornada: 2, puntos: 12 }], ...extra,
});
const manager = (id: string, name: string) => ({ id, name, avatar: "" });

const EQUIPO: LeagueTeam = {
  teamId: "t1", manager: manager("m1", "Ana"), teamMoney: 5_000_000,
  players: [{ ...jugador("1"), buyoutClause: 15_000_000, shieldedUntil: "2099-01-01T00:00:00Z" }, jugador("2")],
};
const CLASIFICACION: StandingRow[] = [
  { position: 1, previousPosition: 2, points: 100, livePoints: 0, teamId: "t1", manager: manager("m1", "Ana"), teamValue: 90_000_000 },
];
const MERCADO: MarketEntry[] = [
  { marketId: "mk1", player: jugador("2"), salePrice: 12_000_000, sellerKind: "marketPlayerTeam", numberOfBids: 3 },
  { marketId: "mk2", player: jugador("3"), salePrice: 10_000_000, sellerKind: "marketPlayerLeague" },
];
const CATALOGO = [jugador("1"), jugador("2"), jugador("3"), jugador("4", { weekPoints: [] })];

const entrada = { catalog: CATALOGO, teams: [EQUIPO], standing: CLASIFICACION, market: MERCADO };

test("una fila por jugador del juego, con su situación en la liga", () => {
  const filas = buildFullExportRows(entrada);
  assert.equal(filas.length, 4);
  const situacion = Object.fromEntries(filas.map((f) => [f.player.id, f.situation]));
  assert.deepEqual(situacion, { "1": "owned", "2": "owned_on_market", "3": "market", "4": "free" });
});

test("ordena: primero lo que se vende, luego los equipos, luego los libres", () => {
  assert.deepEqual(buildFullExportRows(entrada).map((f) => f.situation), ["owned_on_market", "market", "owned", "free"]);
});

test("un jugador de la liga que no está en el catálogo entra igual", () => {
  const filas = buildFullExportRows({ ...entrada, catalog: [] });
  assert.deepEqual(filas.map((f) => f.player.id).sort(), ["1", "2", "3"]);
});

test("el CSV junta dueño, cláusula, mercado y puntos por jornada en la misma fila", () => {
  const csv = buildFullCsv(entrada, new Date("2026-10-12T12:00:00Z"));
  const [cabecera, ...lineas] = csv.trim().split("\n");
  const columnas = cabecera!.split(";");
  const fila = (id: string) => {
    const celdas = lineas.find((l) => l.split(";")[1] === id)!.split(";");
    return Object.fromEntries(columnas.map((c, i) => [c, celdas[i]]));
  };
  assert.ok(columnas.includes("points_w2"));
  assert.ok(!columnas.includes("points_w3"));

  const propio = fila("1");
  assert.equal(propio.manager_name, "Ana");
  assert.equal(propio.manager_rank, "1");
  assert.equal(propio.team_id, "t1");
  assert.equal(propio.clause, "15000000");
  assert.equal(propio.clause_locked, "true");
  assert.equal(propio.market_sale_price, "");

  const enVenta = fila("2");
  assert.equal(enVenta.market_sale_price, "12000000");
  assert.equal(enVenta.calc_sale_vs_value_pct, "20");
  assert.equal(enVenta.market_number_of_bids, "3");
  assert.equal(enVenta.calc_points_per_million, "2");

  const libre = fila("4");
  assert.equal(libre.manager_name, "");
  // Sin puntuación publicada: vacío, no cero.
  assert.equal(libre.points_w1, "");
});
