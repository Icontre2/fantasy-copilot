import assert from 'node:assert/strict';
import test from 'node:test';
import { toca } from './mantener-enlaces.ts';

const AHORA = new Date('2026-10-13T12:00:00Z');

test('se renueva una vez al día: a las 20 h sí, antes no', () => {
  assert.equal(toca('2026-10-12T16:00:00Z', AHORA), true);
  assert.equal(toca('2026-10-13T00:00:00Z', AHORA), false);
});

test('una fecha ilegible se renueva por si acaso', () => {
  assert.equal(toca('nunca', AHORA), true);
});
