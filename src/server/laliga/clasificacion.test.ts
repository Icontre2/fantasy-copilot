import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularClasificacion } from './clasificacion.ts';

const T = (id: string) => ({ id, name: id, shortName: id, slug: id, badge: '' });
const m = (k: string, l: string, v: string, ls: number | null, vs: number | null) => ({ id: k, kickoff: k, local: T(l), visitor: T(v), localScore: ls, visitorScore: vs });

test('puntos, goles, orden y racha', () => {
  const tabla = calcularClasificacion([
    m('2026-09-01', 'A', 'B', 2, 0),
    m('2026-09-08', 'B', 'C', 1, 1),
    m('2026-09-15', 'C', 'A', 3, 1),
    m('2026-09-22', 'A', 'B', null, null), // sin jugar: no cuenta
  ]);
  assert.deepEqual(tabla.map((f) => [f.team.id, f.pts, f.dg]), [['C', 4, 2], ['A', 3, 0], ['B', 1, -2]]);
  assert.deepEqual(tabla[1]!.racha, ['G', 'P']);
  assert.equal(tabla[0]!.pj, 2);
});
