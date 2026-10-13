import assert from 'node:assert/strict';
import test from 'node:test';
import { parseApercibidos } from './apercibidos.ts';

const HTML = `
<div class="row block-new disciplinary-cards">
  <header class="title"><span><a href="https://www.futbolfantasy.com/laliga/equipos/celta">Celta</a></span></header>
  <div class="elemento sancionado"><div class="datos">
    <a href="https://www.futbolfantasy.com/jugadores/yoel-lago" class="jugador">Yoel Lago</a>
    <div class="tarjetascontainer"><span class="cicloA">1r ciclo</span>
      <span class="tarjetasA"><span class="jornadaT">J8</span></span>
      <span class="tarjetasA"><span class="jornadaT">J5</span></span>
    </div></div></div>
</div>
<div class="row block-new disciplinary-cards">
  <header class="title"><span><a href="https://www.futbolfantasy.com/laliga/equipos/real-madrid">Real Madrid</a></span></header>
  <div class="elemento"><div class="datos"><a class="jugador" href="#">Valverde</a></div></div>
</div>`;

test('lee jugador, equipo y jornadas de amarilla de cada bloque', () => {
  assert.deepEqual(parseApercibidos(HTML), [
    { name: 'Yoel Lago', teamSlug: 'celta', jornadas: [5, 8] },
    { name: 'Valverde', teamSlug: 'real-madrid', jornadas: [] },
  ]);
});

test('una página sin bloques no inventa nada', () => {
  assert.deepEqual(parseApercibidos('<html></html>'), []);
});
