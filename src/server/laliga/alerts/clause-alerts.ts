import type { MarketValuePoint, SquadPlayer } from '@/src/domain/fantasy';

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
  | 'tendencia_no_positiva'; // el valor no sube: la estimacion no tiene sentido

export type ClauseAlert = {
  player: { id: string; name: string; team: string; position: string; status: string };
  owner: { teamId: string; managerId: string; managerName: string };

  /** DATOS OFICIALES DE LALIGA, tal cual los publica. */
  official: {
    marketValue: number;
    buyoutClause: number;
    isShielded: boolean;
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
): { dailyTrend: number; points: number } | null {
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
 * Construye la alerta de un jugador, o `null` si no llega a ningun nivel.
 *
 * Un jugador sin `buyoutClause` publicada **no genera alerta**: sin clausula no
 * hay nada con lo que comparar el valor, y rellenarla con una estimacion seria
 * inventar el dato que da sentido a toda la pantalla.
 */
export function buildAlert({ player, owner, history }: OwnedPlayer): ClauseAlert | null {
  const clause = player.buyoutClause;
  if (clause === undefined || clause <= 0) return null;

  const trend = computeDailyTrend(history);
  const dailyTrend = trend?.dailyTrend ?? null;
  const dailyTrendRatio =
    dailyTrend !== null && player.marketValue > 0 ? dailyTrend / player.marketValue : null;

  const gap = clause - player.marketValue;
  const valueToClauseRatio = player.marketValue / clause;

  let estimatedDays: number | null = null;
  let missingReason: MissingReason | undefined;
  if (dailyTrend === null) {
    missingReason = 'sin_historico';
  } else if (dailyTrend <= 0) {
    missingReason = 'tendencia_no_positiva';
  } else if (gap > 0) {
    estimatedDays = gap / dailyTrend;
  }
  // gap <= 0 con tendencia positiva: ya alcanzada, no hay dias que estimar y
  // tampoco es un dato "que falta". Se refleja en `alreadyReachable`.

  const level = classify(valueToClauseRatio, estimatedDays, dailyTrendRatio);
  if (!level) return null;

  return {
    player: {
      id: player.id,
      name: player.name,
      team: player.team,
      position: player.position,
      status: player.status,
    },
    owner,
    official: {
      marketValue: player.marketValue,
      buyoutClause: clause,
      isShielded: player.isShielded ?? false,
    },
    calculated: {
      gap,
      gapRatio: gap / clause,
      valueToClauseRatio,
      dailyTrend,
      dailyTrendRatio,
      estimatedDays,
      historyPoints: trend?.points ?? 0,
      missingReason,
    },
    level,
    alreadyReachable: gap <= 0,
  };
}

/**
 * Alertas de toda la liga, ordenadas por urgencia y, dentro del mismo nivel,
 * por lo cerca que esta el valor de la clausula.
 */
export function buildClauseAlerts(owned: OwnedPlayer[]): ClauseAlert[] {
  return owned
    .map(buildAlert)
    .filter((alert): alert is ClauseAlert => alert !== null)
    .sort(
      (a, b) =>
        LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
        b.calculated.valueToClauseRatio - a.calculated.valueToClauseRatio,
    );
}
