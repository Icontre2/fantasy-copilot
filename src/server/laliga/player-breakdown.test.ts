import assert from "node:assert/strict";
import test from "node:test";
import { desglosar } from "./player-breakdown.ts";

const semana = (weekNumber: number, stats: Record<string, [number, number]>, extra = {}) => ({
  weekNumber,
  totalPoints: Object.values(stats).reduce((acc, [, puntos]) => acc + puntos, 0),
  stats,
  ...extra,
});

test("ordena las jornadas de la más reciente a la más antigua", () => {
  const d = desglosar([semana(1, { mins_played: [90, 2] }), semana(3, { mins_played: [90, 2] }), semana(2, { mins_played: [90, 2] })]);
  assert.deepEqual(d.jornadas.map((j) => j.jornada), [3, 2, 1]);
});

test("solo enseña las métricas en las que pasó algo", () => {
  const d = desglosar([semana(1, { mins_played: [90, 2], goals: [0, 0], ball_recovery: [5, 1] })]);
  assert.deepEqual(d.jornadas[0]!.metricas.map((m) => m.clave), ["mins_played", "ball_recovery"]);
});

test("una portería a cero (valor 0, puntos positivos) se conserva", () => {
  const d = desglosar([semana(1, { goals_conceded: [0, 2] })]);
  assert.equal(d.jornadas[0]!.metricas[0]?.puntos, 2);
});

test("traduce las métricas conocidas y deja la clave en las desconocidas", () => {
  const d = desglosar([semana(1, { goals: [1, 6], metrica_nueva: [3, 1] })]);
  const etiquetas = d.jornadas[0]!.metricas.map((m) => m.etiqueta);
  assert.deepEqual(etiquetas, ["Goles", "metrica_nueva"]);
});

test("si LALIGA da puntos fuera del desglose, se enseña la diferencia", () => {
  const d = desglosar([{ weekNumber: 1, totalPoints: 5, stats: { mins_played: [90, 2] } }]);
  assert.equal(d.jornadas[0]!.sinDesglosar, 3);
});

test("suma la temporada por métrica, valor y puntos", () => {
  const d = desglosar([semana(1, { goals: [1, 6] }), semana(2, { goals: [2, 12], yellow_card: [1, -1] })]);
  const goles = d.temporada.find((m) => m.clave === "goals")!;
  assert.equal(goles.valor, 3);
  assert.equal(goles.puntos, 18);
  assert.equal(d.temporada[0]!.clave, "goals");
});

test("cuenta jornadas con minutos, veces en el once ideal y puntos de Marca", () => {
  const d = desglosar([
    semana(1, { mins_played: [90, 2], marca_points: [3, 3] }, { isInIdealFormation: true }),
    semana(2, { mins_played: [0, 0], marca_points: [-1, -1] }),
  ]);
  assert.equal(d.jornadasConMinutos, 1);
  assert.equal(d.vecesEnOnceIdeal, 1);
  assert.equal(d.puntosMarca, 2);
});

test("el peso reparte solo los puntos positivos y suma 1", () => {
  const d = desglosar([semana(1, { goals: [1, 6], mins_played: [90, 2], yellow_card: [1, -1], marca_points: [2, 2] })]);
  assert.ok(d.peso);
  assert.equal(d.peso.decisiva, 0.6);
  assert.equal(d.peso.juego, 0.2);
  assert.equal(d.peso.valoracion, 0.2);
});

test("una portería a cero cuenta como juego, no como acción decisiva", () => {
  const d = desglosar([semana(1, { goals_conceded: [0, 2], mins_played: [90, 2] })]);
  assert.equal(d.peso?.juego, 1);
});

test("sin puntos positivos no hay reparto: null, no ceros", () => {
  const d = desglosar([semana(1, { yellow_card: [1, -1] })]);
  assert.equal(d.peso, null);
});

test("sin jornadas, todo vacío y sin reparto", () => {
  const d = desglosar([]);
  assert.deepEqual(d.jornadas, []);
  assert.equal(d.peso, null);
});
