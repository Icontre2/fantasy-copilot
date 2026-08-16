import assert from "node:assert/strict";
import test from "node:test";
import { construirIndice, enriquecerJugador } from "./catalog-enrich.ts";

/** Forma minima de un jugador para estas pruebas. */
type Jugador = { id: string; team: string; teamId?: string; image?: string; weekPoints?: { jornada: number; puntos: number }[]; lastSeasonPoints?: number };
const jugador = (datos: Jugador): Jugador => datos;

/*
 * La regla es una y tiene filo: rellenar SOLO lo que falta, sin pisar nunca lo
 * que la liga ya sabe. Un jugador de la plantilla puede traer un equipo distinto
 * al del catalogo (fichajes, cesiones) y en esa pelea gana la plantilla, que es
 * lo especifico de tu liga.
 */

const catalogo = construirIndice([
  { id: "2443", team: "RSO", teamId: "16", image: "https://foto/2443.png", weekPoints: [{ jornada: 1, puntos: 7 }] },
  { id: "68", team: "ATH", teamId: "3", image: "https://foto/68.png" },
]);

test("rellena el equipo cuando la plantilla no lo trae", () => {
  const salida = enriquecerJugador(jugador({ id: "2443", team: "—" }), catalogo);
  assert.equal(salida.team, "RSO");
  assert.equal(salida.teamId, "16");
});

test("rellena la foto cuando falta", () => {
  const salida = enriquecerJugador(jugador({ id: "68", team: "ATH", teamId: "3" }), catalogo);
  assert.equal(salida.image, "https://foto/68.png");
});

test("no pisa el equipo que ya trae la plantilla", () => {
  const salida = enriquecerJugador(jugador({ id: "2443", team: "BAR", teamId: "4" }), catalogo);
  assert.equal(salida.team, "BAR");
  assert.equal(salida.teamId, "4");
});

test("no pisa una foto que ya trae la plantilla", () => {
  const salida = enriquecerJugador(jugador({ id: "2443", team: "RSO", teamId: "16", image: "propia.png" }), catalogo);
  assert.equal(salida.image, "propia.png");
});

test("la racha de jornadas se toma siempre del catalogo", () => {
  // No viene en la plantilla: si el jugador no la trae, se coge entera.
  const salida = enriquecerJugador(jugador({ id: "2443", team: "RSO", teamId: "16", image: "p.png" }), catalogo);
  assert.deepEqual(salida.weekPoints, [{ jornada: 1, puntos: 7 }]);
});

test("un jugador que no esta en el catalogo se queda como esta", () => {
  const salida = enriquecerJugador(jugador({ id: "9999", team: "—" }), catalogo);
  assert.equal(salida.team, "—");
  assert.equal(salida.teamId, undefined);
});

test("si no falta nada, devuelve el mismo objeto sin copiarlo", () => {
  const original = jugador({ id: "68", team: "ATH", teamId: "3", image: "propia.png", weekPoints: [], lastSeasonPoints: 0 });
  assert.equal(enriquecerJugador(original, catalogo), original);
});

test("los puntos del año pasado tambien salen del catalogo", () => {
  // El mercado no los trae, y por eso la ficha enseñaba "Año pasado —" de un
  // jugador cuyo dato si existe.
  const indice = construirIndice([{ id: "68", team: "ATH", teamId: "3", lastSeasonPoints: 211 }]);
  const salida = enriquecerJugador(jugador({ id: "68", team: "ATH", teamId: "3", image: "p.png" }), indice);
  assert.equal(salida.lastSeasonPoints, 211);
});

test("no pisa los puntos del año pasado si ya vienen", () => {
  const indice = construirIndice([{ id: "68", team: "ATH", teamId: "3", lastSeasonPoints: 211 }]);
  const salida = enriquecerJugador(jugador({ id: "68", team: "ATH", teamId: "3", image: "p.png", lastSeasonPoints: 4 }), indice);
  assert.equal(salida.lastSeasonPoints, 4);
});
