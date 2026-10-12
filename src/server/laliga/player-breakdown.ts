/**
 * Desglose de puntos de un jugador: de dónde sale cada punto, jornada a jornada.
 *
 * LALIGA publica, por jornada, cada métrica como `[valor, puntos]` —«3
 * recuperaciones, +1»—. Aquí solo se traduce y se suma; no se pondera ni se
 * estima nada. Lo único que es cálculo nuestro es `peso` y está rotulado así en
 * la pantalla.
 *
 * Vive aparte de `read.ts` por lo de siempre: sin alias `@/`, se puede probar.
 */

/** Grupo de una métrica, para separar lo habitual de lo excepcional. */
export type GrupoMetrica = 'juego' | 'decisiva' | 'castigo' | 'valoracion';

type Definicion = { etiqueta: string; grupo: GrupoMetrica };

/**
 * Nombre en castellano de cada métrica conocida.
 *
 * `decisiva` agrupa lo que da muchos puntos de golpe y no se repite cada semana
 * (goles, asistencias, penaltis). `juego` es lo que suma por estar y trabajar.
 * La división es nuestra; los números de cada fila, no.
 */
export const METRICAS: Record<string, Definicion> = {
  mins_played: { etiqueta: 'Minutos jugados', grupo: 'juego' },
  goals: { etiqueta: 'Goles', grupo: 'decisiva' },
  goal_assist: { etiqueta: 'Asistencias de gol', grupo: 'decisiva' },
  offtarget_att_assist: { etiqueta: 'Asistencias sin gol', grupo: 'juego' },
  pen_area_entries: { etiqueta: 'Balones al área', grupo: 'juego' },
  penalty_won: { etiqueta: 'Penaltis provocados', grupo: 'decisiva' },
  penalty_save: { etiqueta: 'Penaltis parados', grupo: 'decisiva' },
  saves: { etiqueta: 'Paradas', grupo: 'juego' },
  effective_clearance: { etiqueta: 'Despejes', grupo: 'juego' },
  penalty_failed: { etiqueta: 'Penaltis fallados', grupo: 'castigo' },
  own_goals: { etiqueta: 'Goles en propia', grupo: 'castigo' },
  goals_conceded: { etiqueta: 'Goles encajados', grupo: 'castigo' },
  yellow_card: { etiqueta: 'Tarjetas amarillas', grupo: 'castigo' },
  second_yellow_card: { etiqueta: 'Segundas amarillas', grupo: 'castigo' },
  red_card: { etiqueta: 'Tarjetas rojas', grupo: 'castigo' },
  total_scoring_att: { etiqueta: 'Tiros', grupo: 'juego' },
  won_contest: { etiqueta: 'Regates', grupo: 'juego' },
  ball_recovery: { etiqueta: 'Recuperaciones', grupo: 'juego' },
  poss_lost_all: { etiqueta: 'Pérdidas de balón', grupo: 'castigo' },
  penalty_conceded: { etiqueta: 'Penaltis cometidos', grupo: 'castigo' },
  marca_points: { etiqueta: 'Valoración de Marca', grupo: 'valoracion' },
};

/** Una métrica desconocida se enseña con su clave: mejor fea que escondida. */
function definir(clave: string): Definicion {
  return METRICAS[clave] ?? { etiqueta: clave, grupo: 'juego' };
}

export type FilaMetrica = {
  clave: string;
  etiqueta: string;
  grupo: GrupoMetrica;
  /** Lo que hizo: minutos, goles, recuperaciones… */
  valor: number;
  /** Lo que le dio. */
  puntos: number;
};

export type JornadaDesglosada = {
  jornada: number;
  total: number;
  enOnceIdeal: boolean;
  /** Solo las métricas que pasaron algo (valor o puntos distintos de cero). */
  metricas: FilaMetrica[];
  /**
   * `total` menos la suma de las métricas. Hoy es siempre 0; si LALIGA un día
   * da puntos fuera del desglose, se enseña la diferencia en vez de esconderla.
   */
  sinDesglosar: number;
};

export type DesgloseJugador = {
  /** De la más reciente a la más antigua. */
  jornadas: JornadaDesglosada[];
  /** Suma de la temporada por métrica, de más a menos influyente. */
  temporada: FilaMetrica[];
  jornadasConMinutos: number;
  vecesEnOnceIdeal: number;
  /** Puntos de la valoración de Marca en toda la temporada. */
  puntosMarca: number;
  /**
   * CÁLCULO NUESTRO. Qué parte de sus puntos positivos viene de acciones
   * decisivas (goles, asistencias, penaltis). Alto = depende de marcar; bajo =
   * suma por trabajo. `null` si no ha sumado nada positivo.
   */
  peso: { decisiva: number; juego: number; valoracion: number } | null;
};

type SemanaApi = {
  weekNumber: number;
  totalPoints: number;
  isInIdealFormation?: boolean;
  stats: Record<string, [number, number]>;
};

function filas(stats: Record<string, [number, number]>): FilaMetrica[] {
  return Object.entries(stats)
    .filter(([, [valor, puntos]]) => valor !== 0 || puntos !== 0)
    .map(([clave, [valor, puntos]]) => ({ clave, ...definir(clave), valor, puntos }))
    .sort((a, b) => Math.abs(b.puntos) - Math.abs(a.puntos) || a.etiqueta.localeCompare(b.etiqueta));
}

export function desglosar(semanas: SemanaApi[]): DesgloseJugador {
  const jornadas = semanas
    .map((semana) => {
      const metricas = filas(semana.stats);
      const suma = metricas.reduce((acc, fila) => acc + fila.puntos, 0);
      return {
        jornada: semana.weekNumber,
        total: semana.totalPoints,
        enOnceIdeal: semana.isInIdealFormation === true,
        metricas,
        sinDesglosar: semana.totalPoints - suma,
      };
    })
    .sort((a, b) => b.jornada - a.jornada);

  const acumulado = new Map<string, FilaMetrica>();
  for (const jornada of jornadas) {
    for (const fila of jornada.metricas) {
      const previa = acumulado.get(fila.clave);
      acumulado.set(
        fila.clave,
        previa ? { ...previa, valor: previa.valor + fila.valor, puntos: previa.puntos + fila.puntos } : { ...fila },
      );
    }
  }
  const temporada = [...acumulado.values()].sort(
    (a, b) => Math.abs(b.puntos) - Math.abs(a.puntos) || a.etiqueta.localeCompare(b.etiqueta),
  );

  const positivos = { decisiva: 0, juego: 0, valoracion: 0 };
  for (const fila of temporada) {
    if (fila.puntos <= 0) continue;
    // Una métrica de castigo también puede sumar: cero goles encajados da puntos.
    // Eso es trabajo defensivo, no una acción decisiva.
    positivos[fila.grupo === 'castigo' ? 'juego' : fila.grupo] += fila.puntos;
  }
  const totalPositivo = positivos.decisiva + positivos.juego + positivos.valoracion;

  return {
    jornadas,
    temporada,
    jornadasConMinutos: semanas.filter((semana) => (semana.stats.mins_played?.[0] ?? 0) > 0).length,
    vecesEnOnceIdeal: jornadas.filter((jornada) => jornada.enOnceIdeal).length,
    puntosMarca: acumulado.get('marca_points')?.puntos ?? 0,
    peso:
      totalPositivo > 0
        ? {
            decisiva: positivos.decisiva / totalPositivo,
            juego: positivos.juego / totalPositivo,
            valoracion: positivos.valoracion / totalPositivo,
          }
        : null,
  };
}
