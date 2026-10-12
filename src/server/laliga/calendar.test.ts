import assert from "node:assert/strict";
import test from "node:test";
import { mapCalendar } from "./calendar.ts";
import type { Team } from "../../domain/fantasy.ts";

const equipo = (id: string, shortName: string): Team => ({
  id,
  name: shortName,
  shortName,
  slug: shortName.toLowerCase(),
  badge: `https://escudos/${id}.png`,
});

const EQUIPOS: Record<string, Team> = { "3": equipo("3", "ATH"), "4": equipo("4", "BAR") };

const partido = (id: string, matchDate: string, localId: string, visitorId: string, extra = {}) => ({
  id, matchDate, localId, visitorId, ...extra,
});

test("resuelve los equipos a partir de sus ids", () => {
  const [uno] = mapCalendar([partido("1", "2026-08-25T21:00:00+02:00", "3", "4")], EQUIPOS);
  assert.equal(uno?.local?.shortName, "ATH");
  assert.equal(uno?.visitor?.shortName, "BAR");
});

test("un equipo desconocido queda en null, no se inventa el nombre", () => {
  const [uno] = mapCalendar([partido("1", "2026-08-25T21:00:00+02:00", "3", "999")], EQUIPOS);
  assert.equal(uno?.local?.shortName, "ATH");
  assert.equal(uno?.visitor, null);
});

test("un partido sin jugar deja el marcador en null, NO en cero", () => {
  // Es la diferencia entre "todavia no han jugado" y "empataron a cero".
  const [uno] = mapCalendar([partido("1", "2026-08-25T21:00:00+02:00", "3", "4")], EQUIPOS);
  assert.equal(uno?.localScore, null);
  assert.equal(uno?.visitorScore, null);
});

test("un 0-0 real se conserva como cero", () => {
  const [uno] = mapCalendar(
    [partido("1", "2026-08-25T21:00:00+02:00", "3", "4", { localScore: 0, visitorScore: 0 })],
    EQUIPOS,
  );
  assert.equal(uno?.localScore, 0);
  assert.equal(uno?.visitorScore, 0);
});

test("los partidos salen ordenados por hora de inicio", () => {
  const orden = mapCalendar(
    [
      partido("tarde", "2026-08-25T21:00:00+02:00", "3", "4"),
      partido("pronto", "2026-08-25T14:00:00+02:00", "4", "3"),
      partido("medio", "2026-08-25T18:30:00+02:00", "3", "4"),
    ],
    EQUIPOS,
  ).map((match) => match.id);
  assert.deepEqual(orden, ["pronto", "medio", "tarde"]);
});

test("partidosDeEquipo: rival, casa o fuera y marcador desde su lado", async () => {
  const { partidosDeEquipo } = await import("./calendar.ts");
  const j1 = mapCalendar([partido("1", "2026-08-25T21:00:00+02:00", "3", "4", { localScore: 2, visitorScore: 1 })], EQUIPOS);
  const j2 = mapCalendar([partido("2", "2026-09-01T21:00:00+02:00", "4", "3")], EQUIPOS);
  const lista = partidosDeEquipo("4", [{ jornada: 2, partidos: j2 }, { jornada: 1, partidos: j1 }]);
  assert.deepEqual(lista.map((p) => p.jornada), [1, 2]);
  assert.equal(lista[0]?.enCasa, false);
  assert.equal(lista[0]?.rival?.shortName, "ATH");
  assert.equal(lista[0]?.golesPropios, 1);
  assert.equal(lista[0]?.golesRival, 2);
  assert.equal(lista[1]?.enCasa, true);
  assert.equal(lista[1]?.golesPropios, null);
});

test("partidosDeEquipo: una jornada en la que no aparece no se inventa", async () => {
  const { partidosDeEquipo } = await import("./calendar.ts");
  const j1 = mapCalendar([partido("1", "2026-08-25T21:00:00+02:00", "3", "999")], EQUIPOS);
  assert.deepEqual(partidosDeEquipo("4", [{ jornada: 1, partidos: j1 }]), []);
});
