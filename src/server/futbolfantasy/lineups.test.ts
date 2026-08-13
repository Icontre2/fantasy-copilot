import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProbableLineup } from './parser.ts';

function player(id: string, name: string, probability: number, position: string): string {
  return `<div class="jugador_${id} tipo_campo camiseta-wrapper" data-posicion="${position}">
    <a class="camiseta" data-probabilidad="${probability}%"></a>
    <span class="truncate-name">${name}</span>
  </div>`;
}

test('extrae todos los candidatos, sus posiciones y porcentajes', () => {
  const parsed = parseProbableLineup(player('1', 'Sivera', 95, 'Portero') + player('2', 'Tenaglia', 72, 'Defensa'));
  assert.deepEqual(parsed, [
    { externalId: '1', name: 'Sivera', probability: 95, position: 'Portero' },
    { externalId: '2', name: 'Tenaglia', probability: 72, position: 'Defensa' },
  ]);
});

test('no publica una lista vacía cuando cambia el marcado', () => {
  assert.throws(() => parseProbableLineup('<p>otro formato</p>'), /cambió el formato/);
});
