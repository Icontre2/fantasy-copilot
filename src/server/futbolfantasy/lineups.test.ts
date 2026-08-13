import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMatchPage } from './lineups.ts';

test('extrae los dos onces sin mezclar suplentes', () => {
  const player = (name: string) => `<div class="camiseta-wrapper"><div class="fotocontainer"><img alt="${name}"></div></div>`;
  const source = `<section class="alineacion_wrapper"><header class="title">Posibles alineaciones Uno - Dos</header><div class="campo-wrapper local">${Array.from({ length: 12 }, (_, i) => player(`L${i}`)).join('')}</div><div class="campo-wrapper visitante">${Array.from({ length: 11 }, (_, i) => player(`V${i}`)).join('')}</div></section>`;
  const result = parseMatchPage(source, 'https://example.test/partido');
  assert.equal(result.home, 'Uno'); assert.equal(result.away, 'Dos'); assert.equal(result.homePlayers.length, 11); assert.equal(result.awayPlayers.at(-1), 'V10');
});
