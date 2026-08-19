import type { MarketValuePoint, Player, SquadPlayer } from '@/src/domain/fantasy';

/**
 * Alertas de clausula: jugadores cuyo valor de mercado se acerca a su clausula
 * de rescision.
 *
 * ── Por que es aritmetica y no un modelo ─────────────────────────────────────
 * Todo lo que hay aqui son cuatro restas y dos divisiones sobre datos oficiales
 * de LALIGA. No hay prediccion, ni pesos, ni regresion, ni nada calibrado: la
 * "estimacion de dias" es literalmente `cuanto falta / cuanto sube al dia`, con
 * la hipotesis explicita de que la subida reciente se mantiene — hipotesis que
 * casi nunca se cumple exactamente y que por eso se presenta como escenario, no
 * como pronostico.
 *
 * Esto es deliberado: el objetivo es que cualquiera pueda recalcular a mano
 * cualquier numero que muestre la pantalla.
 *
 * ── Que es dato oficial y que es calculo nuestro ─────────────────────────────
 * Oficial (LALIGA): valor de mercado, clausula (`buyoutClause`), blindaje,
 * propietario, y la serie diaria de cotizacion.
 * Calculado (esta app): hueco, porcentaje, tendencia diaria, dias estimados y
 * el nivel de alerta. Cada alerta lo separa en el propio tipo.
 */

/** Dias de historico que se usan para medir la tendencia. */
export const TREND_WINDOW_DAYS = 7;

/**
 * Minimo de observaciones para calcular una tendencia. Con menos de 3 puntos un
 * solo salto de valor domina la media y la estimacion de dias sale absurda.
 */
export const MIN_HISTORY_POINTS = 3;

/**
 * Antiguedad maxima del ultimo punto de cotizacion para que la tendencia se
 * considere ACTUAL, en dias.
 *
 * Existe por un fallo real detectado contra la API: la ventana de tendencia se
 * mide respecto al ultimo punto de la serie, no respecto a hoy. Entre temporadas
 * la serie publica se queda congelada (comprobado el 2026-08-13: el ultimo dato
 * era del 2026-06-30, 44 dias antes), y sin este control la app calculaba la
 * pendiente de finales de junio y la presentaba como "subida reciente", con su
 * "alcanzara la clausula en N dias" incluido. Eso es dato viejo disfrazado de
 * actual, que es justo lo que este proyecto no hace.
 *
 * Tres dias de margen: la serie es diaria, asi que uno o dos dias de retraso son
 * un hipo de la API; una semana ya no describe el presente.
 */
export const MAX_HISTORY_AGE_DAYS = 3;

/**
 * Umbrales de nivel. Los tres primeros son los pedidos en el encargo.
 *
 * `INFO_MIN_DAILY_RISE_RATIO` es el unico que se ha tenido que fijar aqui,
 * porque el encargo pedia "subida fuerte pero todavia lejos" sin numero: se usa
 * **0,5% del valor al dia**, que a 7 dias vista es ~3,5% de revalorizacion. Por
 * debajo de eso el ruido diario del mercado ya explica el movimiento y avisar
 * llenaria la pantalla de jugadores que no van a ninguna parte.
 */
export const THRESHOLDS = {
  criticalValueRatio: 0.95,
  highValueRatio: 0.9,
  highDays: 3,
  mediumDays: 7,
  infoMinDailyRiseRatio: 0.005,
} as const;

export type AlertLevel = 'CRITICA' | 'ALTA' | 'MEDIA' | 'INFORMATIVA';

/** Por que no se ha podido calcular la estimacion de dias. */
export type MissingReason =
  | 'sin_clausula' // LALIGA no publica buyoutClause para ese jugador
  | 'sin_historico' // no hay suficientes puntos de cotizacion
  | 'historico_desactualizado' // el ultimo dato es demasiado viejo para hablar de "reciente"
  | 'tendencia_no_positiva'; // el valor no sube: la estimacion no tiene sentido

export type ClauseAlert = {
  player: Player;
  owner: { teamId: string; managerId: string; managerName: string };

  /** DATOS OFICIALES DE LALIGA, tal cual los publica. */
  official: {
    marketValue: number;
    buyoutClause: number;
    isShielded: boolean;
    /** Fecha ISO de fin del blindaje, si LALIGA la publica. */
    shieldedUntil: string | null;
    /**
     * Dias que faltan para que se levante el blindaje.
     *
     * Es una RESTA de dos fechas reales, no una prevision: sale de la fecha que
     * publica LALIGA menos ahora. `null` cuando esa fecha no viene, y entonces
     * la pantalla lo dice en vez de estimar un plazo.
     */
    daysUntilUnshielded: number | null;
  };

  /** CALCULO DE ESTA APP a partir de los oficiales. Todo en euros salvo ratios. */
  calculated: {
    /** `clausula - valor`. Negativo si el valor ya supero la clausula. */
    gap: number;
    /** `gap / clausula`. Negativo si ya la supero. */
    gapRatio: number;
    /** `valor / clausula`. 0,95 = el valor es el 95% de la clausula. */
    valueToClauseRatio: number;
    /** Variacion media de euros por dia en la ventana reciente. */
    dailyTrend: number | null;
    /** `dailyTrend / valor`: la misma subida en porcentaje diario. */
    dailyTrendRatio: number | null;
    /** `gap / dailyTrend`. Solo si la tendencia es positiva y hay historico. */
    estimatedDays: number | null;
    /** Observaciones de cotizacion usadas para la tendencia. */
    historyPoints: number;
    /** Fecha del ultimo dato de cotizacion disponible. `null` si no hay serie. */
    historyLatestDate: string | null;
    /** Dias transcurridos desde ese ultimo dato. Permite decir "medido hasta X". */
    historyAgeDays: number | null;
    /** Presente cuando `estimatedDays` es null: por que no se pudo calcular. */
    missingReason?: MissingReason;
  };

  level: AlertLevel;
  /** El valor ya iguala o supera la clausula: cualquiera puede pagarla hoy. */
  alreadyReachable: boolean;
};

/**
 * Variacion media diaria del valor, en euros, sobre los ultimos
 * `TREND_WINDOW_DAYS` de cotizacion.
 *
 * Se divide por los dias reales transcurridos entre el primer y el ultimo punto
 * de la ventana, no por el numero de observaciones: la serie de LALIGA puede
 * tener huecos, y contar "puntos" como si fueran dias inflaria la tendencia
 * justo en los jugadores con datos incompletos.
 *
 * Devuelve `null` si no hay observaciones suficientes.
 */
export function computeDailyTrend(
  history: MarketValuePoint[],
  windowDays = TREND_WINDOW_DAYS,
  now: Date = new Date(),
): { dailyTrend: number; points: number; latestDate: string; ageDays: number } | null {
  if (history.length < MIN_HISTORY_POINTS) return null;

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  if (!latest) return null;

  const latestTime = Date.parse(latest.date);
  if (Number.isNaN(latestTime)) return null;

  const cutoff = latestTime - windowDays * 86_400_000;
  const window = sorted.filter((point) => {
    const time = Date.parse(point.date);
    return !Number.isNaN(time) && time >= cutoff;
  });

  if (window.length < MIN_HISTORY_POINTS) return null;

  const first = window[0];
  if (!first) return null;

  const elapsedDays = (latestTime - Date.parse(first.date)) / 86_400_000;
  if (elapsedDays <= 0) return null;

  return {
    dailyTrend: (latest.marketValue - first.marketValue) / elapsedDays,
    points: window.length,
    latestDate: latest.date,
    // Puede salir negativo si el reloj del servidor va por detras del dato: se
    // acota a 0 para no acabar mostrando "hace -1 dias".
    ageDays: Math.max(0, (now.getTime() - latestTime) / 86_400_000),
  };
}

/** Nivel de alerta segun los umbrales documentados arriba. */
export function classify(
  valueToClauseRatio: number,
  estimatedDays: number | null,
  dailyTrendRatio: number | null,
): AlertLevel | null {
  if (valueToClauseRatio >= THRESHOLDS.criticalValueRatio) return 'CRITICA';
  if (valueToClauseRatio >= THRESHOLDS.highValueRatio) return 'ALTA';
  if (estimatedDays !== null && estimatedDays <= THRESHOLDS.highDays) return 'ALTA';
  if (estimatedDays !== null && estimatedDays <= THRESHOLDS.mediumDays) return 'MEDIA';
  if (dailyTrendRatio !== null && dailyTrendRatio >= THRESHOLDS.infoMinDailyRiseRatio) return 'INFORMATIVA';
  return null;
}

const LEVEL_ORDER: Record<AlertLevel, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, INFORMATIVA: 3 };

export type OwnedPlayer = {
  player: SquadPlayer;
  owner: ClauseAlert['owner'];
  /** Historico de cotizacion del jugador. Vacio si no se pudo descargar. */
  history: MarketValuePoint[];
};

/**
 * Dias que faltan hasta `iso`, o `null` si no hay fecha o no es una fecha.
 *
 * Nunca devuelve negativo: una fecha ya pasada significa que el blindaje se
 * levanto, no que falten dias en negativo.
 */
export function daysUntil(iso: string | undefined, now: Date): number | null {
  if (!iso) return null;
  const target = Date.parse(iso);
  if (Number.isNaN(target)) return null;
  return Math.max(0, (target - now.getTime()) / 86_400_000);
}

/**
 * Estado efectivo del bloqueo de cláusula.
 *
 * LALIGA publica `buyoutClauseLockedEndTime` con precisión de minutos. Cuando
 * esa fecha es válida es la fuente de verdad: una fecha futura bloquea y una
 * fecha pasada desbloquea, aunque el booleano `isShielded` venga ausente o
 * desfasado. El booleano solo sirve como respaldo cuando no hay fecha legible.
 */
export function isClauseShielded(player: Pick<SquadPlayer, 'isShielded' | 'shieldedUntil'>, now: Date = new Date()): boolean {
  if (player.shieldedUntil) {
    const unlockAt = Date.parse(player.shieldedUntil);
    if (!Number.isNaN(unlockAt)) return unlockAt > now.getTime();
  }
  return player.isShielded === true;
}

/**
 * Construye la alerta de un jugador, o `null` si no llega a ningun nivel.
 *
 * Un jugador sin `buyoutClause` publicada **no genera alerta**: sin clausula no
 * hay nada con lo que comparar el valor, y rellenarla con una estimacion seria
 * inventar el dato que da sentido a toda la pantalla.
 */
export function buildAlert(
  { player, owner, history }: OwnedPlayer,
  now: Date = new Date(),
): ClauseAlert | null {
  const clause = player.buyoutClause;
  if (clause === undefined || clause <= 0) return null;

  const trend = computeDailyTrend(history, TREND_WINDOW_DAYS, now);

  // Un historico congelado NO produce tendencia. El valor y la clausula siguen
  // siendo de hoy (vienen de la plantilla, no de la serie), asi que la alerta por
  // cercania se mantiene; lo que desaparece es la parte que dice "esta subiendo"
  // y su estimacion de dias, que serian una pendiente vieja presentada como
  // actual. Ver MAX_HISTORY_AGE_DAYS.
  const isStale = trend !== null && trend.ageDays > MAX_HISTORY_AGE_DAYS;
  const dailyTrend = trend === null || isStale ? null : trend.dailyTrend;
  const dailyTrendRatio =
    dailyTrend !== null && player.marketValue > 0 ? dailyTrend / player.marketValue : null;

  const gap = clause - player.marketValue;
  const valueToClauseRatio = player.marketValue / clause;
  const effectiveShielded = isClauseShielded(player, now);

  let estimatedDays: number | null = null;
  let missingReason: MissingReason | undefined;
  if (trend === null) {
    missingReason = 'sin_historico';
  } else if (isStale) {
    missingReason = 'historico_desactualizado';
  } else if (dailyTrend === null || dailyTrend <= 0) {
    missingReason = 'tendencia_no_positiva';
  } else if (gap > 0) {
    estimatedDays = gap / dailyTrend;
  }
  // gap <= 0 con tendencia positiva: ya alcanzada, no hay dias que estimar y
  // tampoco es un dato "que falta". Se refleja en `alreadyReachable`.

  const level = classify(valueToClauseRatio, estimatedDays, dailyTrendRatio);
  if (!level) return null;

  return {
    player,
    owner,
    official: {
      marketValue: player.marketValue,
      buyoutClause: clause,
      isShielded: effectiveShielded,
      shieldedUntil: player.shieldedUntil ?? null,
      daysUntilUnshielded: daysUntil(player.shieldedUntil, now),
    },
    calculated: {
      gap,
      gapRatio: gap / clause,
      valueToClauseRatio,
      dailyTrend,
      dailyTrendRatio,
      estimatedDays,
      historyPoints: trend?.points ?? 0,
      historyLatestDate: trend?.latestDate ?? null,
      historyAgeDays: trend ? Math.round(trend.ageDays * 10) / 10 : null,
      missingReason,
    },
    level,
    alreadyReachable: gap <= 0,
  };
}

/**
 * Cuando se puede fichar a ese jugador, en dias desde ahora.
 *
 * 0 = ahora mismo, sin blindaje. `Infinity` = LALIGA no publica hasta cuando
 * esta bloqueado, asi que no se sabe si se abre mañana o en un mes; va al final
 * y no delante de plazos que si constan, porque ordenar por un dato que no
 * existe seria inventarse el orden.
 */
function diasHastaPoderFichar(alert: ClauseAlert): number {
  if (!alert.official.isShielded) return 0;
  return alert.official.daysUntilUnshielded ?? Number.POSITIVE_INFINITY;
}

/**
 * Alertas de toda la liga, ordenadas por CUANDO se puede actuar.
 *
 * Primero las que ya estan abiertas, y despues las bloqueadas de menos a mas
 * tiempo para desbloquearse. Antes mandaba el nivel de alerta, y eso ponia
 * arriba una CRITICA blindada tres semanas —sobre la que hoy no se puede hacer
 * absolutamente nada— por delante de una alerta menor que se abre esta tarde.
 * Una lista de avisos se lee de arriba abajo hasta que uno se cansa, asi que
 * arriba tiene que estar lo que se puede fichar antes.
 *
 * El nivel y lo cerca que esta el valor siguen decidiendo, pero como desempate
 * dentro del mismo plazo.
 */
export function buildClauseAlerts(owned: OwnedPlayer[], now: Date = new Date()): ClauseAlert[] {
  return owned
    .map((entry) => buildAlert(entry, now))
    .filter((alert): alert is ClauseAlert => alert !== null)
    .sort(
      (a, b) =>
        diasHastaPoderFichar(a) - diasHastaPoderFichar(b) ||
        LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
        b.calculated.valueToClauseRatio - a.calculated.valueToClauseRatio,
    );
}
