import assert from "node:assert/strict";
import test from "node:test";
import { propiedadDe } from "./ownership.ts";
import type { LeagueTeam, SquadPlayer } from "../../domain/fantasy.ts";

const M = (n: number) => n * 1_000_000;
const AHORA = new Date("2026-08-17T12:00:00Z");

const jugador = (id: string, extra: Partial<SquadPlayer> = {}): SquadPlayer => ({
  id, name: `Jugador ${id}`, team: "SEV", position: "DEL", marketValue: M(10),
  points: 30, averagePoints: 5, status: "ok", buyoutClause: M(20), ...extra,
});

const equipo = (managerId: string, players: SquadPlayer[], teamMoney?: number): LeagueTeam => ({
  teamId: `t-${managerId}`, manager: { id: managerId, name: `Mánager ${managerId}`, avatar: "" },
  teamMoney, players,
});

const LIGA = (extra: Partial<SquadPlayer> = {}, miCaja?: number) => [
  equipo("yo", [jugador("mio")], miCaja),
  equipo("rival", [jugador("suyo", extra)]),
];

test("un jugador de un rival, sin blindaje y con caja: se puede pagar", () => {
  const p = propiedadDe(LIGA({}, M(50)), "suyo", "yo", AHORA);
  assert.equal(p.sePuedePagar, true);
  assert.equal(p.motivo, null);
  assert.equal(p.duenoNombre, "Mánager rival");
  assert.equal(p.esMio, false);
});

test("un jugador propio no se puede clausular, y lo dice", () => {
  const p = propiedadDe(LIGA({}, M(50)), "mio", "yo", AHORA);
  assert.equal(p.esMio, true);
  assert.equal(p.sePuedePagar, false);
  assert.match(p.motivo ?? "", /Es tuyo/);
});

test("blindado: no se puede, y se distingue de cualquier otro motivo", () => {
  const futuro = new Date(AHORA.getTime() + 3_600_000).toISOString();
  const p = propiedadDe(LIGA({ shieldedUntil: futuro }, M(50)), "suyo", "yo", AHORA);
  assert.equal(p.blindado, true);
  assert.equal(p.sePuedePagar, false);
  assert.match(p.motivo ?? "", /blindado/);
  assert.equal(p.blindadoHasta, futuro);
});

test("un blindaje ya vencido no bloquea nada", () => {
  const pasado = new Date(AHORA.getTime() - 3_600_000).toISOString();
  const p = propiedadDe(LIGA({ shieldedUntil: pasado, isShielded: true }, M(50)), "suyo", "yo", AHORA);
  assert.equal(p.blindado, false);
  assert.equal(p.sePuedePagar, true);
});

test("sin cláusula publicada no se ofrece pagar: no se inventa una", () => {
  const p = propiedadDe(LIGA({ buyoutClause: undefined }, M(50)), "suyo", "yo", AHORA);
  assert.equal(p.clausula, null);
  assert.equal(p.sePuedePagar, false);
  assert.match(p.motivo ?? "", /no publica la cláusula/);
});

test("caja insuficiente conocida: no se puede", () => {
  const p = propiedadDe(LIGA({}, M(5)), "suyo", "yo", AHORA);
  assert.equal(p.sePuedePagar, false);
  assert.match(p.motivo ?? "", /no te llega la caja/i);
});

test("EL matiz: caja NO publicada no bloquea, porque no saber no es saber que no", () => {
  // Sin `teamMoney`. Dar por hecho que no tienes dinero seria inventarse un
  // motivo; se deja intentar y que conteste LALIGA, que es quien manda.
  const p = propiedadDe(LIGA({}, undefined), "suyo", "yo", AHORA);
  assert.equal(p.miCaja, null);
  assert.equal(p.sePuedePagar, true);
});

test("caja justa, exactamente igual a la cláusula: llega", () => {
  const p = propiedadDe(LIGA({}, M(20)), "suyo", "yo", AHORA);
  assert.equal(p.sePuedePagar, true);
});

test("un jugador que no tiene nadie es del mercado, no de un rival", () => {
  const p = propiedadDe(LIGA({}, M(50)), "nadie-lo-tiene", "yo", AHORA);
  assert.equal(p.duenoManagerId, null);
  assert.equal(p.sePuedePagar, false);
  assert.match(p.motivo ?? "", /no lo tiene nadie/);
});
