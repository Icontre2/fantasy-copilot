import assert from "node:assert/strict";
import test from "node:test";
import { nombreDeFichero, textoDeTarjeta } from "./share-card.ts";

const base = { managerName: "Íñigo", leagueName: "Liga de la oficina", teamValue: 152_300_000, delta: 4_200_000, periodo: "en 7 días", position: 2, totalManagers: 10, points: 311 };

test("la tarjeta dice valor, variación con su periodo, posición y puntos", () => {
  const t = textoDeTarjeta(base);
  assert.equal(t.antetitulo, "Íñigo · Liga de la oficina");
  assert.equal(t.valor, "152,3 M€");
  assert.equal(t.variacion, "+4,20 M€ · en 7 días");
  assert.equal(t.sube, true);
  assert.equal(t.posicion, "#2 de 10");
  assert.equal(t.puntos, "311 pts");
});

test("lo que no se sabe no sale: ni variación inventada ni posición cero", () => {
  const t = textoDeTarjeta({ ...base, delta: null, position: undefined, points: undefined, teamValue: undefined });
  assert.equal(t.variacion, null);
  assert.equal(t.sube, null);
  assert.equal(t.posicion, null);
  assert.equal(t.puntos, null);
  assert.equal(t.valor, "—");
});

test("una bajada se dice como bajada", () => {
  const t = textoDeTarjeta({ ...base, delta: -1_500_000 });
  assert.equal(t.variacion, "-1,50 M€ · en 7 días");
  assert.equal(t.sube, false);
});

test("el pie deja claro que no es de LALIGA", () => {
  assert.match(textoDeTarjeta(base).pie, /no afiliada a LALIGA/);
});

test("nombre de fichero sin tildes ni espacios", () => {
  assert.equal(nombreDeFichero("Íñigo Pérez", new Date("2026-09-23T10:00:00Z")), "ligalab-inigo-perez-2026-09-23.png");
  assert.equal(nombreDeFichero("🔥", new Date("2026-09-23T10:00:00Z")), "ligalab-plantilla-2026-09-23.png");
});
