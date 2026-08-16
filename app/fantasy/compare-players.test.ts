import assert from "node:assert/strict";
import test from "node:test";
import type { Player, SquadPlayer } from "@/src/domain/fantasy";
import { mergeComparisonPlayers } from "./compare-players.ts";

const base: Player = {
  id: "1", name: "Libre", team: "BET", teamId: "bet", position: "MED",
  marketValue: 1_000_000, points: 0, averagePoints: 0, status: "ok",
};

test("incluye jugadores libres que solo existen en el catálogo", () => {
  const result = mergeComparisonPlayers([base], []);
  assert.deepEqual(result.map((player) => player.id), ["1"]);
});

test("la plantilla conserva cláusula y prevalece sobre el catálogo", () => {
  const owned: SquadPlayer = { ...base, name: "Nombre actualizado", buyoutClause: 7_000_000 };
  const result = mergeComparisonPlayers([base], [owned]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.name, "Nombre actualizado");
  assert.equal(result[0]?.buyoutClause, 7_000_000);
});

test("no elimina un fichaje que todavía no aparece en el catálogo", () => {
  const newcomer: SquadPlayer = { ...base, id: "2", name: "Nuevo" };
  assert.deepEqual(mergeComparisonPlayers([], [newcomer]).map((player) => player.id), ["2"]);
});
