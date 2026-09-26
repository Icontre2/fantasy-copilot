import assert from 'node:assert/strict';
import test from 'node:test';
import { cambiosSugeridos, onceDado, onceOptimo, predecirJugadores } from '../../../app/fantasy/prediccion.ts';
import type { PlayerWithProbability } from '../../../app/fantasy/types.ts';
import { cuando, mensajeDePrevia, primerPartido, tocaPrevia } from './previa.ts';

const H = 3_600_000;
const AHORA = new Date('2026-09-26T10:00:00Z'); // 12:00 en Madrid

test('la ventana: entre 26 h y 1 h antes del primer partido', () => {
  assert.equal(tocaPrevia(AHORA.getTime() + 27 * H, AHORA), false);
  assert.equal(tocaPrevia(AHORA.getTime() + 26 * H, AHORA), true);
  assert.equal(tocaPrevia(AHORA.getTime() + 2 * H, AHORA), true);
  assert.equal(tocaPrevia(AHORA.getTime() + 0.5 * H, AHORA), false);
  assert.equal(tocaPrevia(null, AHORA), false);
});

test('el primer partido es el más temprano, ignorando fechas ilegibles', () => {
  assert.equal(primerPartido(['2026-09-27T19:00:00Z', 'x', '2026-09-26T19:00:00Z']), Date.parse('2026-09-26T19:00:00Z'));
  assert.equal(primerPartido([]), null);
});

test('«hoy», «mañana» o el día de la semana, en hora de España', () => {
  assert.equal(cuando(Date.parse('2026-09-26T19:00:00Z'), AHORA), 'hoy a las 21:00');
  assert.equal(cuando(Date.parse('2026-09-27T12:00:00Z'), AHORA), 'mañana a las 14:00');
  assert.match(cuando(Date.parse('2026-09-28T19:00:00Z'), AHORA), /^el lunes a las 21:00$/);
});

let n = 0;
const j = (position: string, averagePoints: number): PlayerWithProbability =>
  ({ id: `${position}${++n}`, name: `${position}${n}`, team: 'X', position, marketValue: 1, points: 0, averagePoints, status: 'ok', lineupProbability: 100 }) as PlayerWithProbability;

test('el mensaje: jornada, cuándo, puntos del mejor once y qué cambiar', () => {
  n = 0;
  const players = [j('POR', 5), j('DEF', 6), j('DEF', 5), j('DEF', 4), j('DEF', 3), j('DEF', 1), j('MED', 7), j('MED', 6), j('MED', 5), j('MED', 2), j('DEL', 9), j('DEL', 8), j('DEL', 1)];
  const predichos = predecirJugadores(players, null);
  const optimo = onceOptimo(predichos)!;
  const ids = optimo.titulares.map((t) => t.player.id).filter((id) => id !== 'DEF4').concat('DEL13');
  const actual = onceDado('3-4-3', ids, predichos);
  const m = mensajeDePrevia({ jornada: 7, inicio: Date.parse('2026-09-26T19:00:00Z'), ahora: AHORA, optimo, actual, cambios: cambiosSugeridos(actual, optimo), leagueId: 'L1' });
  assert.equal(m.titulo, 'Jornada 7 · empieza hoy a las 21:00');
  assert.match(m.cuerpo, /^Tu mejor once ≈ 60,0 pts\. Cambia DEF4 por DEL13 \(≈ \+3,0\)\. Revisa tu alineación/);
  assert.equal(m.url, '/?league=L1&section=plantilla');
});

test('sin cambios que sumen, lo dice en vez de inventar uno', () => {
  n = 0;
  const players = [j('POR', 5), j('DEF', 6), j('DEF', 5), j('DEF', 4), j('DEF', 3), j('MED', 7), j('MED', 6), j('MED', 5), j('MED', 2), j('DEL', 9), j('DEL', 8)];
  const predichos = predecirJugadores(players, null);
  const optimo = onceOptimo(predichos)!;
  const m = mensajeDePrevia({ jornada: 7, inicio: AHORA.getTime() + 5 * H, ahora: AHORA, optimo, actual: optimo, cambios: [], leagueId: 'L1' });
  assert.match(m.cuerpo, /ya es el que más suma/);
});
