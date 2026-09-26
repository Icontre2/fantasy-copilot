import assert from 'node:assert/strict';
import test from 'node:test';
import { errorMedio, evaluar, jornadaEmpezada, leerPrediccion } from './registro.ts';

const valida = {
  jornada: 7,
  formacion: '4-4-2',
  total: 57.34,
  jugadores: [{ id: '1', name: 'Pedri', puntos: 7.44 }, { id: '2', name: 'Lewandowski', puntos: 8 }],
};

test('lee una predicción válida y redondea a una décima', () => {
  const p = leerPrediccion(valida)!;
  assert.equal(p.total, 57.3);
  assert.equal(p.jugadores[0]!.puntos, 7.4);
});

test('rechaza lo que no es una predicción: sin jornada, total absurdo, más de 11 jugadores', () => {
  assert.equal(leerPrediccion({ ...valida, jornada: 'x' }), null);
  assert.equal(leerPrediccion({ ...valida, total: -1 }), null);
  assert.equal(leerPrediccion({ ...valida, jugadores: Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: 'a', puntos: 1 })) }), null);
  assert.equal(leerPrediccion({ ...valida, jugadores: [{ id: '', name: 'a', puntos: 1 }] }), null);
  assert.equal(leerPrediccion(null), null);
});

test('la jornada empieza con el PRIMER partido', () => {
  const kickoffs = ['2026-09-27T14:00:00Z', '2026-09-26T19:00:00Z', '2026-09-28T19:00:00Z'];
  assert.equal(jornadaEmpezada(kickoffs, new Date('2026-09-26T18:59:00Z')), false);
  assert.equal(jornadaEmpezada(kickoffs, new Date('2026-09-26T19:00:00Z')), true);
  assert.equal(jornadaEmpezada([], new Date()), false);
});

test('evaluar: suma los reales de esos jugadores; quien no tiene puntos no jugó y cuenta cero', () => {
  const reales: Record<string, number> = { '1': 12 };
  const e = evaluar(leerPrediccion(valida)!, (id) => reales[id] ?? null);
  assert.equal(e.real, 12);
  assert.equal(e.previsto, 57.3);
  assert.equal(e.error, -45.3);
});

test('error medio absoluto: se equivoca por arriba y por abajo, no se compensa', () => {
  assert.equal(errorMedio([{ jornada: 1, previsto: 50, real: 55, error: 5 }, { jornada: 2, previsto: 50, real: 45, error: -5 }]), 5);
  assert.equal(errorMedio([]), null);
});
