import assert from 'node:assert/strict';
import test from 'node:test';
import { extraerCallback } from './callback-url.ts';

const URL_OK = 'authredirect://com.lfp.laligafantasy?state=abc&code=eyJraWQiOi.x-y_z';

test('acepta la dirección sola', () => {
  assert.equal(extraerCallback(`  ${URL_OK}  `), URL_OK);
});

test('la saca de la frase de la consola de Chrome', () => {
  const frase = `Failed to launch '${URL_OK}' because the scheme does not have a registered handler.`;
  assert.equal(extraerCallback(frase), URL_OK);
});

test('quita un punto final pegado', () => {
  assert.equal(extraerCallback(`${URL_OK}.`), URL_OK);
});

test('rechaza lo que no es la vuelta del login oficial', () => {
  assert.equal(extraerCallback('https://example.com/?code=1'), null);
  assert.equal(extraerCallback('authredirect://otra.app?code=1'), null);
  assert.equal(extraerCallback(''), null);
});
