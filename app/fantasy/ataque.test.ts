import assert from "node:assert/strict";
import test from "node:test";
import { buscarObjetivos, type CriteriosDeAtaque } from "./ataque.ts";
import type { LeagueTeam, SquadPlayer } from "./types.ts";

const M = (n: number) => n * 1_000_000;
const AHORA = new Date("2026-09-23T12:00:00Z");

const jugador = (name: string, over: Partial<SquadPlayer> = {}): SquadPlayer => ({
  id: name, name, team: "RMA", position: "DEL" as never, marketValue: M(10),
  points: 20, averagePoints: 5, status: "ok", buyoutClause: M(15), ...over,
}) as SquadPlayer;

const equipo = (managerId: string, players: SquadPlayer[]): LeagueTeam => ({
  teamId: `t-${managerId}`, manager: { id: managerId, name: managerId.toUpperCase() } as never, players,
});

const base = (teams: LeagueTeam[], over: Partial<CriteriosDeAtaque> = {}): CriteriosDeAtaque => ({
  teams, myManagerId: "yo", miCaja: M(20), ahora: AHORA, orden: "MEDIA", posicion: "TODAS", soloDisponibles: true, ...over,
});

test("solo entran jugadores RIVALES cuya cláusula cubre mi caja", () => {
  const r = buscarObjetivos(base([
    equipo("yo", [jugador("Mío", { buyoutClause: M(1) })]),
    equipo("ana", [jugador("Barato", { buyoutClause: M(18) }), jugador("Caro", { buyoutClause: M(25) })]),
  ]));
  assert.deepEqual(r.ya.map((o) => o.player.name), ["Barato"]);
  assert.equal(r.fueraDeAlcance, 1);
  assert.equal(r.ya[0]?.cajaTras, M(2));
  assert.equal(r.ya[0]?.owner.managerName, "ANA");
});

test("un blindado va a «pronto», no a «ya», y se ordena por cuándo se libera", () => {
  const r = buscarObjetivos(base([equipo("ana", [
    jugador("Tarde", { shieldedUntil: "2026-10-05T00:00:00Z" }),
    jugador("Antes", { shieldedUntil: "2026-09-25T00:00:00Z" }),
    jugador("Libre"),
  ])]));
  assert.deepEqual(r.ya.map((o) => o.player.name), ["Libre"]);
  assert.deepEqual(r.pronto.map((o) => o.player.name), ["Antes", "Tarde"]);
});

test("fecha de blindaje pasada = pagable, aunque la bandera siga puesta (misma regla que el servidor)", () => {
  const r = buscarObjetivos(base([equipo("ana", [jugador("Vencido", { isShielded: true, shieldedUntil: "2026-09-01T00:00:00Z" })])]));
  assert.equal(r.ya.length, 1);
});

test("lesionados y sancionados fuera por defecto; se pueden incluir", () => {
  const teams = [equipo("ana", [jugador("Lesionado", { status: "injured" }), jugador("Duda", { status: "doubtful" })])];
  assert.deepEqual(buscarObjetivos(base(teams)).ya.map((o) => o.player.name), ["Duda"]);
  assert.equal(buscarObjetivos(base(teams, { soloDisponibles: false })).ya.length, 2);
});

test("tres órdenes distintos: media, puntos y menor sobreprecio", () => {
  const teams = [equipo("ana", [
    jugador("MejorMedia", { averagePoints: 9, points: 30, marketValue: M(10), buyoutClause: M(19) }),
    jugador("MasPuntos", { averagePoints: 6, points: 60, marketValue: M(10), buyoutClause: M(15) }),
    jugador("Ganga", { averagePoints: 4, points: 20, marketValue: M(10), buyoutClause: M(11) }),
  ])];
  assert.equal(buscarObjetivos(base(teams)).ya[0]?.player.name, "MejorMedia");
  assert.equal(buscarObjetivos(base(teams, { orden: "PUNTOS" })).ya[0]?.player.name, "MasPuntos");
  const ganga = buscarObjetivos(base(teams, { orden: "SOBREPRECIO" })).ya[0];
  assert.equal(ganga?.player.name, "Ganga");
  assert.equal(ganga?.sobreprecio, M(1));
});

test("filtro de posición", () => {
  const r = buscarObjetivos(base([equipo("ana", [jugador("Portero", { position: "POR" as never }), jugador("Delantero")])], { posicion: "POR" }));
  assert.deepEqual(r.ya.map((o) => o.player.name), ["Portero"]);
});

test("sin cláusula publicada no es objetivo ni cuenta como fuera de alcance", () => {
  const r = buscarObjetivos(base([equipo("ana", [jugador("SinClausula", { buyoutClause: undefined })])]));
  assert.equal(r.ya.length + r.pronto.length + r.fueraDeAlcance, 0);
});
