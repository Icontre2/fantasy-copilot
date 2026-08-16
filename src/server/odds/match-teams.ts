import type { Team } from '@/src/domain/fantasy';

/**
 * Emparejar el nombre de equipo que da la casa de apuestas con el de LALIGA.
 *
 * Esta es la pieza peligrosa de toda la funcionalidad. Las casas escriben
 * "Athletic Bilbao", "Atletico Madrid", "Real Sociedad", "Celta Vigo"; LALIGA
 * dice "Athletic Club", "Atlético de Madrid", "Real Sociedad", "Celta". Si el
 * cruce se equivoca, la app enseña las cuotas de OTRO partido — y eso no se
 * nota mirando: parecen cuotas perfectamente razonables.
 *
 * Por eso la regla es conservadora: se exige que el nombre de la casa contenga
 * TODAS las palabras distintivas del equipo, o al revés. Ante la duda, `null`, y
 * ese partido se queda sin cuotas. Un hueco se ve; un cruce equivocado no.
 */

/**
 * Palabras que no distinguen a nadie: casi todos los clubes las llevan.
 *
 * OJO con lo que NO está en esta lista. "Real" y "Deportivo" parecen relleno y
 * no lo son: quitando "Real", el Real Madrid se queda en "madrid", que encaja
 * dentro de "Atletico Madrid" y convierte un partido entre ambos en un cruce
 * ambiguo. Lo cazó un test.
 */
const RUIDO = new Set(['cf', 'fc', 'rc', 'cd', 'ud', 'sd', 'ca', 'rcd', 'club', 'de', 'the']);

export function normalizar(nombre: string): string[] {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((palabra) => palabra.length > 1 && !RUIDO.has(palabra));
}

/**
 * El equipo cuyo nombre encaja con `nombreCasa`, o `null` si no hay uno claro.
 *
 * Encaja cuando un conjunto de palabras contiene al otro: "athletic bilbao"
 * contiene a "athletic", y "atletico madrid" contiene a "atletico madrid". Si
 * encajan dos equipos distintos, tambien devuelve `null`: dos candidatos es lo
 * mismo que ninguno.
 */
export function emparejar(nombreCasa: string, equipos: Team[]): Team | null {
  const casa = normalizar(nombreCasa);
  if (casa.length === 0) return null;

  const mismasPalabras = (a: string[], b: string[]) =>
    a.length === b.length && a.every((palabra) => b.includes(palabra));

  /*
   * Primero, coincidencia EXACTA de palabras. Va antes que la parcial porque
   * resuelve los casos donde un nombre está contenido en otro: "RCD Espanyol de
   * Barcelona" contiene a "Barcelona", pero si el Espanyol se reconoce a sí
   * mismo de forma exacta, esa ambigüedad no llega a plantearse.
   */
  const exactos = equipos.filter((equipo) => mismasPalabras(casa, normalizar(equipo.name)));
  if (exactos.length === 1) return exactos[0]!;

  // Y si no, coincidencia parcial: un conjunto contiene al otro entero.
  const parciales = equipos.filter((equipo) => {
    const suyo = normalizar(equipo.name);
    if (suyo.length === 0) return false;
    return suyo.every((palabra) => casa.includes(palabra)) || casa.every((palabra) => suyo.includes(palabra));
  });

  return parciales.length === 1 ? parciales[0]! : null;
}
