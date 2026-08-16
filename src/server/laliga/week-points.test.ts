import assert from "node:assert/strict";
import test from "node:test";
import { leerJornada, leerJornadas, puntosDeJornada, ultimasJornadas } from "./week-points.ts";

/*
 * Hoy `weekPoints` llega vacio en los 731 jugadores porque no se ha cerrado
 * ninguna jornada. Estos tests fijan la unica regla que sostiene el modulo
 * mientras tanto: leer lo que se reconoce y callar lo que no. Nada de asumir
 * posiciones ni de rellenar con ceros.
 */

test("lee una jornada con los nombres de campo mas largos", () => {
  assert.deepEqual(leerJornada({ weekNumber: 3, totalPoints: 8 }), { jornada: 3, puntos: 8 });
});

test("lee tambien la variante corta", () => {
  assert.deepEqual(leerJornada({ week: 3, points: 8 }), { jornada: 3, puntos: 8 });
});

test("acepta numeros que vienen como texto, como hace el resto de la API", () => {
  assert.deepEqual(leerJornada({ weekNumber: "3", totalPoints: "8" }), { jornada: 3, puntos: 8 });
});

test("una entrada que no se reconoce se descarta, no se adivina", () => {
  assert.equal(leerJornada({ jornada: 3, tantos: 8 }), null);
  assert.equal(leerJornada([3, 8]), null);
  assert.equal(leerJornada(null), null);
});

test("cero puntos es un dato y se conserva", () => {
  assert.deepEqual(leerJornada({ weekNumber: 1, totalPoints: 0 }), { jornada: 1, puntos: 0 });
});

test("la lista vacia de hoy no produce jornadas inventadas", () => {
  assert.deepEqual(leerJornadas([]), []);
  assert.deepEqual(leerJornadas(undefined), []);
  assert.deepEqual(leerJornadas("todavia no"), []);
});

test("las jornadas salen ordenadas y se ignoran las ilegibles", () => {
  const leidas = leerJornadas([
    { weekNumber: 3, totalPoints: 8 },
    { esto: "no se entiende" },
    { weekNumber: 1, totalPoints: 2 },
  ]);
  assert.deepEqual(leidas, [{ jornada: 1, puntos: 2 }, { jornada: 3, puntos: 8 }]);
});

test("una jornada que no consta es `null`, no cero", () => {
  // La diferencia entre "no jugo" y "jugo y no puntuo".
  const jornadas = [{ jornada: 1, puntos: 0 }];
  assert.equal(puntosDeJornada(jornadas, 1), 0);
  assert.equal(puntosDeJornada(jornadas, 2), null);
});

test("la racha son las ultimas jornadas jugadas", () => {
  const jornadas = [1, 2, 3, 4, 5, 6].map((jornada) => ({ jornada, puntos: jornada }));
  assert.deepEqual(ultimasJornadas(jornadas, 3).map((entrada) => entrada.jornada), [4, 5, 6]);
});
