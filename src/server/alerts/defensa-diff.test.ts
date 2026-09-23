import assert from 'node:assert/strict';
import test from 'node:test';
import { analizarDefensa, type Comprador } from '../../../app/fantasy/defensa.ts';
import type { PlayerWithProbability } from '../../../app/fantasy/types.ts';
import { diferenciarDefensa, estadoAFilas, filasAEstado, mensajeDeDefensa } from './defensa-diff.ts';

const M = (n: number) => n * 1_000_000;
const AHORA = new Date('2026-09-23T12:00:00Z');
const jugador = (name: string, over: Partial<PlayerWithProbability> = {}) =>
  ({ id: name, name, team: 'BAR', position: 'MED', marketValue: M(10), points: 0, averagePoints: 0, status: 'ok', buyoutClause: M(20), ...over }) as PlayerWithProbability;
const rival = (id: string, poder: number): Comprador => ({ managerId: id, nombre: id.toUpperCase(), poder, estimado: true });

test('primera vez que un rival puede pagarlo: se avisa', () => {
  const defensas = analizarDefensa([jugador('Pedri')], [rival('ana', M(30))], M(50), AHORA);
  const { aAvisar } = diferenciarDefensa(new Map(), defensas);
  assert.deepEqual(aAvisar.map((a) => [a.defensa.player.name, a.nuevos.map((n) => n.nombre)]), [['Pedri', ['ANA']]]);
});

test('al día siguiente, mismo rival: no se repite', () => {
  const defensas = analizarDefensa([jugador('Pedri')], [rival('ana', M(30))], M(50), AHORA);
  const { estadoNuevo } = diferenciarDefensa(new Map(), defensas);
  assert.equal(diferenciarDefensa(estadoNuevo, defensas).aAvisar.length, 0);
});

test('se suma otro rival: se avisa solo del nuevo', () => {
  const ayer = diferenciarDefensa(new Map(), analizarDefensa([jugador('Pedri')], [rival('ana', M(30))], M(50), AHORA)).estadoNuevo;
  const hoy = analizarDefensa([jugador('Pedri')], [rival('ana', M(30)), rival('luis', M(25))], M(50), AHORA);
  assert.deepEqual(diferenciarDefensa(ayer, hoy).aAvisar[0]?.nuevos.map((n) => n.nombre), ['LUIS']);
});

test('blindado no avisa; al levantarse, sí', () => {
  const blindado = analizarDefensa([jugador('Pedri', { shieldedUntil: '2026-09-30T00:00:00Z' })], [rival('ana', M(30))], M(50), AHORA);
  const r1 = diferenciarDefensa(new Map(), blindado);
  assert.equal(r1.aAvisar.length, 0);
  const libre = analizarDefensa([jugador('Pedri', { shieldedUntil: '2026-09-30T00:00:00Z' })], [rival('ana', M(30))], M(50), new Date('2026-10-01T00:00:00Z'));
  assert.equal(diferenciarDefensa(r1.estadoNuevo, libre).aAvisar.length, 1);
});

test('el estado sobrevive a guardarlo en filas y leerlo, e ignora filas ajenas', () => {
  const estado = diferenciarDefensa(new Map(), analizarDefensa([jugador('Pedri')], [rival('luis', M(30)), rival('ana', M(40))], M(50), AHORA)).estadoNuevo;
  const filas = estadoAFilas(estado);
  assert.deepEqual(filas, [{ player_id: 'defensa:Pedri', level: 'ana,luis' }]);
  const leido = filasAEstado([...filas, { player_id: 'Otro', level: 'CRITICA' }]);
  assert.deepEqual([...leido.entries()].map(([k, v]) => [k, [...v]]), [['Pedri', ['ana', 'luis']]]);
});

test('el mensaje dice quién, cuánto y qué costaría proteger, y abre Defensa', () => {
  const defensas = analizarDefensa([jugador('Pedri')], [rival('ana', M(30))], M(50), AHORA);
  const aviso = diferenciarDefensa(new Map(), defensas).aAvisar[0]!;
  const m = mensajeDeDefensa(aviso, 'L1');
  assert.equal(m.titulo, 'En riesgo · Pedri');
  assert.equal(m.cuerpo, 'ANA ya puede pagar su cláusula de 20,0 M€. Subirla a 30,1 M€ te costaría ≈ 5,0 M€.');
  assert.equal(m.url, '/?league=L1&section=defensa');
});
