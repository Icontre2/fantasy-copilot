import type { Team } from '@/src/domain/fantasy';
import { emparejar } from './match-teams.ts';
import { probabilidades, type CuotasPartido, type Probabilidades } from './implied.ts';

/**
 * Cuotas 1X2 de los proximos partidos de LALIGA.
 *
 * Fuente: `football-data.co.uk/fixtures.csv`, un CSV abierto que publica las
 * cuotas de varias casas para los partidos de los proximos dias. SIN clave y sin
 * registro, que es justo lo que se buscaba.
 *
 * Por que este y no otro:
 *   - The Odds API funciona, pero exige registrarse y una clave por correo.
 *   - BeSoccer bloquea a todo lo que no sea un navegador de verdad: responde 406
 *     a `curl` y corta la conexion a un navegador automatizado. No se puede leer
 *     ni para comprobar si el formato cambia, y una fuente que no se puede
 *     probar es una fuente que se rompe en silencio.
 *
 * Lo que trae y lo que no: solo los partidos que las casas ya tienen abiertos,
 * o sea los de los proximos dias. Un partido de dentro de tres meses no tiene
 * cuotas en ningun sitio, y aqui aparece sin ellas en vez de con un numero
 * inventado.
 */

const URL_FIXTURES = 'https://www.football-data.co.uk/fixtures.csv';

/** Codigo de LALIGA en esta fuente. */
const LALIGA = 'SP1';

/** Cada cuanto se vuelve a pedir. Las cuotas se mueven, pero no por minutos. */
const CACHE_MS = 3 * 60 * 60 * 1000;

/**
 * Nombres que esta fuente usa y que no se parecen a los de LALIGA.
 *
 * Salen de SUS ficheros, no de suposiciones: se listaron los equipos de las
 * temporadas 24/25 y 25/26 y se cruzaron con nuestro mapa. Los demas encajan
 * solos ("Vallecano", "Sociedad", "Betis", "Santander"…), asi que aqui solo
 * estan los cuatro que no.
 */
const ALIAS: Record<string, string> = {
  'ath bilbao': 'Athletic Club',
  'ath madrid': 'Atlético de Madrid',
  espanol: 'RCD Espanyol de Barcelona',
  'dep. a coruna': 'RC Deportivo',
};

export type CuotasDePartido = {
  localId: string;
  visitorId: string;
  /** Fecha del partido segun la fuente, en ISO corto. Sirve para desempatar. */
  fecha: string;
  cuotas: CuotasPartido;
  probabilidades: Probabilidades;
  /** Quien publica estas cuotas. Se enseña siempre: es su precio, no el nuestro. */
  casa: string;
};

/** Una fila del CSV, ya con sus columnas nombradas. */
export type FilaCsv = Record<string, string>;

/**
 * CSV a filas. Sin dependencias y sin comillas: este fichero no las usa, y un
 * parser generico seria mas codigo del que hace falta.
 */
export function leerCsv(texto: string): FilaCsv[] {
  const lineas = texto.split(/\r?\n/).filter((linea) => linea.trim() !== '');
  const cabecera = lineas[0]?.replace(/^﻿/, '').split(',');
  if (!cabecera) return [];
  return lineas.slice(1).map((linea) => {
    const celdas = linea.split(',');
    return Object.fromEntries(cabecera.map((nombre, i) => [nombre, celdas[i] ?? '']));
  });
}

/** `dd/mm/yyyy` (o `dd/mm/yy`) a `yyyy-mm-dd`. `null` si no se entiende. */
export function fechaIso(fecha: string): string | null {
  const partes = fecha.trim().split('/');
  if (partes.length !== 3) return null;
  const [dia, mes, anio] = partes;
  if (!dia || !mes || !anio) return null;
  const completo = anio.length === 2 ? `20${anio}` : anio;
  if (!/^\d{4}$/.test(completo) || !/^\d{1,2}$/.test(mes) || !/^\d{1,2}$/.test(dia)) return null;
  return `${completo}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

function numero(valor: string | undefined): number | undefined {
  if (!valor || valor.trim() === '') return undefined;
  const n = Number(valor);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Las cuotas de una fila.
 *
 * Se prefiere Bet365 porque es el precio de UNA casa concreta y se puede citar
 * como tal. Si no viene, se usa la media de mercado que publica la propia
 * fuente — y entonces se dice que es una media, no se hace pasar por una casa.
 */
export function cuotasDeFila(fila: FilaCsv): { cuotas: CuotasPartido; casa: string } | null {
  const bet365 = {
    local: numero(fila.B365H),
    empate: numero(fila.B365D),
    visitante: numero(fila.B365A),
  };
  if (bet365.local && bet365.empate && bet365.visitante) {
    return { cuotas: bet365 as CuotasPartido, casa: 'Bet365' };
  }

  const media = { local: numero(fila.AvgH), empate: numero(fila.AvgD), visitante: numero(fila.AvgA) };
  if (media.local && media.empate && media.visitante) {
    return { cuotas: media as CuotasPartido, casa: 'media del mercado' };
  }
  return null;
}

/** Traduce el nombre de la fuente al del equipo de LALIGA, o `null`. */
export function equipoDe(nombreFuente: string, equipos: Team[]): Team | null {
  const alias = ALIAS[nombreFuente.trim().toLowerCase()];
  return emparejar(alias ?? nombreFuente, equipos);
}

/** Filas del CSV a cuotas ya emparejadas. Lo que no se entiende, se descarta. */
export function interpretar(filas: FilaCsv[], equipos: Team[]): CuotasDePartido[] {
  const salida: CuotasDePartido[] = [];
  for (const fila of filas) {
    if (fila.Div !== LALIGA) continue;

    const local = equipoDe(fila.HomeTeam ?? '', equipos);
    const visitante = equipoDe(fila.AwayTeam ?? '', equipos);
    // Sin identificar a los dos no hay cuotas para ese partido. Un cruce
    // equivocado enseñaria las cuotas de otro sin que se notara.
    if (!local || !visitante || local.id === visitante.id) continue;

    const precio = cuotasDeFila(fila);
    if (!precio) continue;

    const probs = probabilidades(precio.cuotas);
    if (!probs) continue;

    const fecha = fechaIso(fila.Date ?? '');
    if (!fecha) continue;

    salida.push({
      localId: local.id,
      visitorId: visitante.id,
      fecha,
      cuotas: precio.cuotas,
      probabilidades: probs,
      casa: precio.casa,
    });
  }
  return salida;
}

let cache: { at: number; cuotas: CuotasDePartido[] } | null = null;

/**
 * Cuotas de los proximos partidos. `null` si la fuente no responde: la pantalla
 * distingue eso de "este partido todavia no tiene cuotas".
 */
export async function getCuotas(equipos: Team[]): Promise<CuotasDePartido[] | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.cuotas;
  try {
    const response = await fetch(URL_FIXTURES, {
      headers: { Accept: 'text/csv,*/*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const cuotas = interpretar(leerCsv(await response.text()), equipos);
    cache = { at: Date.now(), cuotas };
    return cuotas;
  } catch {
    // Que se caiga la fuente de cuotas no puede tumbar el calendario.
    return null;
  }
}
