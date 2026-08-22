// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizarPaquete } from '../packages.ts';
import type { RadarOpportunity } from '../schemas.ts';

/**
 * Etapa 1.5 — la selección: qué oportunidades del Radar merecen la cadena
 * cara, y cuáles NO porque ya tienen pieza.
 *
 * ── Por qué esto dejó de vivir dentro del script ────────────────────────────
 * Esta lógica estaba en `scripts/marketing/prepare-agent-queue.mjs`, un
 * fichero con `await` de nivel superior que ningún test podía importar. Y
 * tenía un fallo que solo se ve ejecutándolo: el 22 de agosto había una pieza
 * hecha a mano (`LL-2026-001`) sobre la oportunidad `LL-RADAR-20260822-001`,
 * y volver a preparar la cola de ese mismo día creaba `LL-20260822-001`
 * sobre ESA MISMA oportunidad. Dos piezas, dos ids, el mismo tema — y la
 * segunda a punto de gastar cinco llamadas a Opus para repetir la primera.
 *
 * Nada lo detectaba porque los dos ficheros son válidos por separado: el
 * choque solo existe al mirar las dos convenciones de id a la vez. Por eso la
 * comprobación se hace por `sourceOpportunityId` —la procedencia, que ambas
 * convenciones declaran— y nunca por el id de la pieza, que es justo el campo
 * en el que las dos convenciones no se parecen.
 */

/** Por qué una oportunidad del Radar no entra hoy en la cadena cara. */
export type MotivoDeDescarte = 'ya_convertida' | 'score_bajo' | 'fuera_del_limite_diario';

export type Descartada = {
  id: string;
  title: string;
  score: number;
  motivo: MotivoDeDescarte;
  /** Qué pieza ya cubre esta oportunidad. Solo para `ya_convertida`. */
  piezaExistente?: string;
};

export type Seleccion = {
  seleccionadas: RadarOpportunity[];
  descartadas: Descartada[];
};

export type CriteriosDeSeleccion = {
  oportunidades: RadarOpportunity[];
  /** `sourceOpportunityId` → id de la pieza que ya la cubre. */
  yaConvertidas: Map<string, string>;
  minimumScore: number;
  limite: number;
};

/**
 * Decide la tanda del día. Es pura a propósito: recibe el mapa de lo ya
 * convertido en vez de leer el disco, para que un test pueda plantear el
 * choque sin fabricar un árbol de ficheros.
 *
 * El orden de los descartes importa: primero «ya convertida», porque una
 * oportunidad con pieza no debe contar contra el límite diario de tres. Si se
 * filtrara por límite antes que por duplicado, un día con dos piezas ya
 * hechas produciría una sola pieza nueva en vez de tres.
 */
export function seleccionarOportunidades(criterios: CriteriosDeSeleccion): Seleccion {
  const { oportunidades, yaConvertidas, minimumScore, limite } = criterios;
  const descartadas: Descartada[] = [];
  const resumen = (o: RadarOpportunity) => ({ id: o.id, title: o.title, score: o.score });

  const candidatas: RadarOpportunity[] = [];
  for (const oportunidad of oportunidades) {
    const piezaExistente = yaConvertidas.get(oportunidad.id);
    if (piezaExistente !== undefined) {
      descartadas.push({ ...resumen(oportunidad), motivo: 'ya_convertida', piezaExistente });
      continue;
    }
    if (!Number.isInteger(oportunidad.score) || oportunidad.score < minimumScore) {
      descartadas.push({ ...resumen(oportunidad), motivo: 'score_bajo' });
      continue;
    }
    candidatas.push(oportunidad);
  }

  const ordenadas = [...candidatas].sort((a, b) => b.score - a.score);
  const seleccionadas = ordenadas.slice(0, limite);
  for (const sobrante of ordenadas.slice(limite)) {
    descartadas.push({ ...resumen(sobrante), motivo: 'fuera_del_limite_diario' });
  }

  return { seleccionadas, descartadas };
}

/**
 * Qué oportunidades del Radar tienen YA una pieza en `marketing/generated/**`.
 *
 * Mira todas las fechas, no solo la de hoy: una oportunidad convertida ayer no
 * debe volver a convertirse hoy porque el Radar la repita. Y pasa cada fichero
 * por `normalizarPaquete`, que es quien traduce el `radarId` de la convención
 * antigua al `sourceOpportunityId` de la nueva — sin eso, la pieza hecha a
 * mano sería invisible para esta comprobación, que es exactamente el fallo
 * que esto arregla.
 *
 * Un `package.json` ilegible NO se ignora en silencio: se cuenta como
 * ocupante si declara su procedencia, porque una pieza rota sigue siendo una
 * pieza sobre ese tema. Por eso se lee el JSON crudo y no se valida contra el
 * esquema.
 */
export async function oportunidadesYaConvertidas(raiz: string): Promise<Map<string, string>> {
  const convertidas = new Map<string, string>();
  const carpeta = path.join(raiz, 'marketing', 'generated');

  const fechas = await readdir(carpeta, { withFileTypes: true }).catch(() => []);
  for (const fecha of fechas) {
    if (!fecha.isDirectory()) continue;
    const ids = await readdir(path.join(carpeta, fecha.name), { withFileTypes: true }).catch(() => []);
    for (const id of ids) {
      if (!id.isDirectory()) continue;
      const ruta = path.join(carpeta, fecha.name, id.name, 'package.json');
      const texto = await readFile(ruta, 'utf8').catch(() => null);
      if (texto === null) continue;

      let json: unknown;
      try {
        json = JSON.parse(texto);
      } catch {
        continue;
      }
      if (!json || typeof json !== 'object') continue;

      const normalizado = normalizarPaquete(json as Record<string, unknown>);
      const procedencia = normalizado.sourceOpportunityId;
      // `normalizarPaquete` cae al propio id de la pieza cuando el fichero no
      // declara procedencia. Eso sirve para PODER revisarla en el panel, pero
      // aquí sería una mentira: significaría que la pieza ocupa una
      // oportunidad del Radar que en realidad no se sabe cuál es.
      if (typeof procedencia !== 'string' || procedencia === id.name) continue;
      if (!convertidas.has(procedencia)) convertidas.set(procedencia, id.name);
    }
  }
  return convertidas;
}

/** El id de pieza número `numero` (1-based) de la fecha dada. */
export function idDePieza(fecha: string, numero: number): string {
  return `LL-${fecha.replaceAll('-', '')}-${String(numero).padStart(3, '0')}`;
}

/** Los ids de pieza que ya existen en `marketing/generated/<fecha>/`. */
export async function piezasDeLaFecha(raiz: string, fecha: string): Promise<string[]> {
  const entradas = await readdir(path.join(raiz, 'marketing', 'generated', fecha), { withFileTypes: true }).catch(() => []);
  return entradas.filter((e) => e.isDirectory()).map((e) => e.name);
}

/**
 * El número que le toca a la siguiente pieza de esta fecha.
 *
 * ── Por qué no vale la posición dentro de la tanda ──────────────────────────
 * La primera versión de esto numeraba por posición: la pieza `n` de la tanda
 * era `LL-<fecha>-00n`. Funciona una vez. A la segunda ejecución del mismo
 * día, las oportunidades ya convertidas salen de la selección, entran otras
 * distintas — y vuelven a numerarse desde 001, encima de las que ya existían.
 * Los ficheros se salvaban (no se pisa lo que existe), pero `queue.json`
 * quedaba apuntando `LL-<fecha>-001` a una oportunidad distinta de la que
 * declara el `package.json` de ese mismo id. Una cola que miente es peor que
 * una cola que falta.
 *
 * Numerar a partir de lo que YA hay en disco no puede colisionar. Se ignoran
 * los ids que no siguen el patrón de la fecha —como `LL-2026-001`, de la
 * convención antigua—: numeran otra cosa y no dicen nada sobre esta serie.
 */
export function siguienteNumeroDePieza(fecha: string, idsExistentes: string[]): number {
  const patron = new RegExp(`^LL-${fecha.replaceAll('-', '')}-(\\d+)$`);
  const numeros = idsExistentes.map((id) => patron.exec(id)).filter((m) => m !== null).map((m) => Number(m[1]));
  return Math.max(0, ...numeros) + 1;
}

/**
 * Cuántas piezas caras quedan por hacer hoy.
 *
 * `creativeCandidateLimit` es un techo POR DÍA, no por ejecución: la regla de
 * `automation.config.json` dice «nunca ejecutar las etapas caras para más de
 * las 3 mejores oportunidades del Radar». Descontar lo que ya existe para esa
 * fecha es lo que impide que ejecutar el comando dos veces cueste el doble.
 * Cuenta también las piezas de la convención antigua: una pieza es una pieza,
 * la haya escrito el script o una persona.
 */
export function plazasLibres(limiteDiario: number, piezasYaExistentes: number): number {
  return Math.max(0, limiteDiario - piezasYaExistentes);
}
