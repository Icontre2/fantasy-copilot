import assert from "node:assert/strict";
import test from "node:test";
import { analizarDefensa, analizarJugador, compradoresDeLiga, costeDeSubida, quienesPueden, resumirDefensa, type Comprador } from "./defensa.ts";
import type { ManagerEconomy, PlayerWithProbability } from "./types.ts";

const M = (n: number) => n * 1_000_000;
const AHORA = new Date("2026-09-23T12:00:00Z");

function jugador(over: Partial<PlayerWithProbability> & { name: string }): PlayerWithProbability {
  return {
    id: over.name, team: "RMA", position: "DEL" as never, marketValue: M(10),
    points: 0, averagePoints: 0, status: "ok", buyoutClause: M(20), ...over,
  } as PlayerWithProbability;
}

const rival = (nombre: string, poder: number, estimado = true): Comprador => ({ managerId: nombre, nombre, poder, estimado });

test("un jugador cuya cláusula cubre algún rival está EXPUESTO y dice quién", () => {
  const d = analizarJugador(jugador({ name: "Pedri" }), [rival("Ana", M(30)), rival("Luis", M(15))], M(50), AHORA);
  assert.equal(d.nivel, "EXPUESTO");
  assert.deepEqual(d.pueden.map((c) => c.nombre), ["Ana"]);
});

test("protegerlo apunta por encima del rival MÁS RICO y cuesta la mitad de la subida (regla 2:1)", () => {
  const d = analizarJugador(jugador({ name: "Pedri" }), [rival("Ana", M(30)), rival("Luis", M(25))], M(50), AHORA);
  // 30 M€ + 1 € redondeado al alza a 100.000 € → 30,1 M€. Subir 10,1 M€ cuesta 5,05 M€.
  assert.equal(d.proteccion?.clausulaObjetivo, 30_100_000);
  assert.equal(d.proteccion?.coste, 5_050_000);
  assert.equal(d.proteccion?.asequible, true);
});

test("si tu caja no llega, se dice; si no se conoce, no se inventa", () => {
  const pobre = analizarJugador(jugador({ name: "Pedri" }), [rival("Ana", M(30))], M(1), AHORA);
  assert.equal(pobre.proteccion?.asequible, false);
  const desconocida = analizarJugador(jugador({ name: "Pedri" }), [rival("Ana", M(30))], null, AHORA);
  assert.equal(desconocida.proteccion?.asequible, null);
});

test("nadie puede pagarla: SEGURO, con el margen hasta el rival más rico", () => {
  const d = analizarJugador(jugador({ name: "Pedri", buyoutClause: M(40) }), [rival("Ana", M(30))], M(50), AHORA);
  assert.equal(d.nivel, "SEGURO");
  assert.equal(d.margen, M(10));
  assert.equal(d.proteccion, null);
});

test("blindado con fecha futura: BLINDADO, pero avisa de quién podrá pagarla al levantarse", () => {
  const d = analizarJugador(jugador({ name: "Pedri", isShielded: true, shieldedUntil: "2026-09-30T00:00:00Z" }), [rival("Ana", M(30))], M(50), AHORA);
  assert.equal(d.nivel, "BLINDADO");
  assert.equal(d.blindadoHasta, "2026-09-30T00:00:00Z");
  assert.deepEqual(d.pueden.map((c) => c.nombre), ["Ana"]);
});

test("un blindaje ya vencido no protege, aunque la bandera siga puesta", () => {
  const d = analizarJugador(jugador({ name: "Pedri", isShielded: true, shieldedUntil: "2026-09-01T00:00:00Z" }), [rival("Ana", M(30))], M(50), AHORA);
  assert.equal(d.nivel, "EXPUESTO");
  assert.equal(d.blindadoHasta, null);
});

test("blindado sin fecha: se respeta el dato oficial", () => {
  const d = analizarJugador(jugador({ name: "Pedri", isShielded: true }), [rival("Ana", M(30))], M(50), AHORA);
  assert.equal(d.nivel, "BLINDADO");
});

test("sin cláusula publicada no se calcula nada", () => {
  const d = analizarJugador(jugador({ name: "Pedri", buyoutClause: undefined }), [rival("Ana", M(30))], M(50), AHORA);
  assert.equal(d.nivel, "SIN_CLAUSULA");
  assert.deepEqual(d.pueden, []);
});

test("orden: expuestos (más rivales antes), blindados, seguros (menos margen antes), sin cláusula", () => {
  const compradores = [rival("Ana", M(30)), rival("Luis", M(22))];
  const orden = analizarDefensa([
    jugador({ name: "SinClausula", buyoutClause: undefined }),
    jugador({ name: "SeguroHolgado", buyoutClause: M(60) }),
    jugador({ name: "SeguroJusto", buyoutClause: M(31) }),
    jugador({ name: "Blindado", isShielded: true }),
    jugador({ name: "UnRival", buyoutClause: M(25) }),
    jugador({ name: "DosRivales", buyoutClause: M(20) }),
  ], compradores, M(50), AHORA).map((d) => d.player.name);
  assert.deepEqual(orden, ["DosRivales", "UnRival", "Blindado", "SeguroJusto", "SeguroHolgado", "SinClausula"]);
});

test("la caja oficial manda sobre la reconstruida, y un rival sin ninguna no cuenta como cero", () => {
  const economia = (managerId: string, cajaReconstruida: number, cajaOficial: number | null = null) =>
    ({ managerId, cajaReconstruida, cajaOficial }) as ManagerEconomy;
  const compradores = compradoresDeLiga(
    [
      { manager: { id: "a", name: "Ana" }, teamMoney: M(5) },
      { manager: { id: "b", name: "Luis" } },
      { manager: { id: "c", name: "Sin datos" } },
    ],
    [economia("a", M(99)), economia("b", M(12))],
  );
  assert.deepEqual(compradores, [
    { managerId: "b", nombre: "Luis", poder: M(12), estimado: true },
    { managerId: "a", nombre: "Ana", poder: M(5), estimado: false },
  ]);
});

test("coste de subida: nunca negativo", () => {
  assert.equal(costeDeSubida(M(20), M(10)), 0);
  assert.equal(costeDeSubida(M(20), M(21)), 500_000);
});

test("quienesPueden incluye al que tiene exactamente la cláusula", () => {
  assert.equal(quienesPueden(M(20), [rival("Ana", M(20))]).length, 1);
});

test("el resumen suma el valor de mercado expuesto", () => {
  const r = resumirDefensa(analizarDefensa([
    jugador({ name: "A", marketValue: M(8) }),
    jugador({ name: "B", marketValue: M(4) }),
    jugador({ name: "C", buyoutClause: M(90) }),
  ], [rival("Ana", M(30))], null, AHORA));
  assert.deepEqual(r, { expuestos: 2, blindados: 0, seguros: 1, sinClausula: 0, valorExpuesto: M(12) });
});
