import assert from 'node:assert/strict';
import test from 'node:test';
import { collectActivityPages } from './activity-pages.ts';
import type { ActivityEntry } from './economy/activity.ts';

const entry = (id: string): ActivityEntry => ({
  id,
  activityTypeId: 31,
  user1Id: 'manager',
  amount: 1,
  createdAt: `2026-08-${id.padStart(2, '0')}T10:00:00+02:00`,
});

test('recorre /activity/{index} hasta la primera pagina vacia', async () => {
  const requested: number[] = [];
  const pages = [[entry('3'), entry('2')], [entry('1')], []];

  const result = await collectActivityPages(async (index) => {
    requested.push(index);
    return pages[index] ?? [];
  });

  assert.deepEqual(requested, [0, 1, 2]);
  assert.deepEqual(result.map(({ id }) => id), ['3', '2', '1']);
});

test('elimina solapes de frontera sin duplicar dinero', async () => {
  const pages = [[entry('3'), entry('2')], [entry('2'), entry('1')], []];
  const result = await collectActivityPages(async (index) => pages[index] ?? []);
  assert.deepEqual(result.map(({ id }) => id), ['3', '2', '1']);
});

test('se detiene si el servidor repite una pagina completa', async () => {
  let calls = 0;
  const repeated = [entry('3'), entry('2')];
  const result = await collectActivityPages(async () => {
    calls += 1;
    return repeated;
  });
  assert.equal(calls, 2);
  assert.equal(result.length, 2);
});
