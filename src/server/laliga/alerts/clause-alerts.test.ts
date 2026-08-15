import assert from "node:assert/strict";
import test from "node:test";
import type { MarketValuePoint, SquadPlayer } from "../../../domain/fantasy.ts";
import {
  buildAlert,
  buildClauseAlerts,
  classify,
  computeDailyTrend,
  MAX_HISTORY_AGE_DAYS,
  MIN_HISTORY_POINTS,
  TREND_WINDOW_DAYS,
  THRESHOLDS,
  type OwnedPlayer,
} from "./clause-alerts.ts";

const owner = { teamId: "t1", managerId: "m1", managerName: "Javier" };

/**
 * Momento fijo de referencia. Los tests NO pueden depender del reloj: la
 * frescura del historico ahora decide si hay tendencia, asi que un test anclado
 * a `new Date()` pasaria hoy y fallaria dentro de unos dias sin que nadie toque
 * el codigo.
 */
const NOW = new Date("2026-08-13T12:00:00.000Z");

function player(overrides: Partial<SquadPlayer> = {}): SquadPlayer {
  return {
    id: "p1",
    name: "Jugador",
    team: "BAR",
    position: "MED",
    marketValue: 18_200_000,
    points: 0,
    averagePoints: 0,
    status: "ok",
    buyoutClause: 20_000_000,
    ...overrides,
  };
}

/** Serie diaria que sube `perDay` euros al dia durante `days` dias. */
function risingHistory(from: number, perDay: number, days: number): MarketValuePoint[] {
  return Array.from({ length: days }, (_, index) => ({
    // Fechas consecutivas terminando el dia de NOW.
    date: new Date(Date.UTC(2026, 7, 13) - (days - 1 - index) * 86_400_000)
      .toISOString()
      .slice(0, 10),
    marketValue: from + perDay * index,
  }));
}

test("computeDailyTrend divide por dias reales, no por numero de observaciones", () => {
  // Dos observaciones separadas por 4 dias, mas una intermedia: 400.000 en total.
  const history: MarketValuePoint[] = [
    { date: "2026-08-09", marketValue: 10_000_000 },
    { date: "2026-08-11", marketValue: 10_200_000 },
    { date: "2026-08-13", marketValue: 10_400_000 },
  ];

  const trend = computeDailyTrend(history, TREND_WINDOW_DAYS, NOW);

  assert.ok(trend);
  assert.equal(trend.points, 3);
  // 400.000 EUR en 4 dias = 100.000/dia. Contar "3 puntos" habria dado 133.333.
  assert.equal(trend.dailyTrend, 100_000);
});

test("computeDailyTrend devuelve null sin historico suficiente", () => {
  const history = risingHistory(10_000_000, 100_000, MIN_HISTORY_POINTS - 1);
  assert.equal(computeDailyTrend(history, TREND_WINDOW_DAYS, NOW), null);
});

test("computeDailyTrend ignora los puntos fuera de la ventana", () => {
  const history: MarketValuePoint[] = [
    // Caida brusca hace un mes: no debe contaminar la tendencia de 7 dias.
    { date: "2026-07-13", marketValue: 30_000_000 },
    { date: "2026-08-10", marketValue: 10_000_000 },
    { date: "2026-08-11", marketValue: 10_100_000 },
    { date: "2026-08-13", marketValue: 10_300_000 },
  ];

  const trend = computeDailyTrend(history, TREND_WINDOW_DAYS, NOW);

  assert.ok(trend);
  assert.equal(trend.points, 3);
  assert.equal(trend.dailyTrend, 100_000);
});

test("el ejemplo del encargo: 18,2M de valor, 20M de clausula, +350.000/dia", () => {
  const alert = buildAlert(
    {
    player: player({ marketValue: 18_200_000, buyoutClause: 20_000_000 }),
    owner,
    history: risingHistory(16_100_000, 350_000, 7),
  }, NOW);

  assert.ok(alert);
  assert.equal(alert.calculated.gap, 1_800_000);
  assert.equal(alert.calculated.dailyTrend, 350_000);
  // 1.800.000 / 350.000 = 5,14 dias.
  assert.ok(alert.calculated.estimatedDays !== null);
  assert.ok(Math.abs(alert.calculated.estimatedDays - 5.142857) < 0.0001);
  // ALTA, y por el ratio de valor (18,2/20 = 91% >= 90%), no por los dias: el
  // umbral de valor se evalua primero, asi que 5,14 dias no llega a decidir.
  assert.equal(alert.calculated.valueToClauseRatio, 0.91);
  assert.equal(alert.level, "ALTA");
  assert.equal(alert.alreadyReachable, false);
});

test("MEDIA se alcanza por plazo cuando el ratio de valor aun no alerta", () => {
  const alert = buildAlert(
    {
    // 17M / 20M = 85%: por debajo del 90%, asi que decide la estimacion.
    player: player({ marketValue: 17_000_000, buyoutClause: 20_000_000 }),
    owner,
    history: risingHistory(14_900_000, 350_000, 7),
  }, NOW);

  assert.ok(alert);
  // 3.000.000 / 350.000 = 8,57 dias... por encima de 7. No deberia ser MEDIA.
  assert.ok(alert.calculated.estimatedDays !== null);
  assert.ok(alert.calculated.estimatedDays > THRESHOLDS.mediumDays);
  assert.equal(alert.level, "INFORMATIVA");
});

test("CRITICA cuando el valor llega al 95% de la clausula, aunque no suba", () => {
  const alert = buildAlert(
    {
    player: player({ marketValue: 19_000_000, buyoutClause: 20_000_000 }),
    owner,
    history: [],
  }, NOW);

  assert.ok(alert);
  assert.equal(alert.level, "CRITICA");
  assert.equal(alert.calculated.estimatedDays, null);
  assert.equal(alert.calculated.missingReason, "sin_historico");
});

test("valor por encima de la clausula: alreadyReachable y sin dias que estimar", () => {
  const alert = buildAlert(
    {
    player: player({ marketValue: 21_000_000, buyoutClause: 20_000_000 }),
    owner,
    history: risingHistory(19_000_000, 300_000, 7),
  }, NOW);

  assert.ok(alert);
  assert.equal(alert.level, "CRITICA");
  assert.equal(alert.alreadyReachable, true);
  assert.equal(alert.calculated.estimatedDays, null);
  // No es un dato que falte: es que la pregunta ya no aplica.
  assert.equal(alert.calculated.missingReason, undefined);
  assert.ok(alert.calculated.gap < 0);
});

test("sin clausula publicada no se genera alerta: no se inventa el dato", () => {
  const alert = buildAlert(
    {
    player: player({ buyoutClause: undefined }),
    owner,
    history: risingHistory(16_000_000, 500_000, 7),
  }, NOW);

  assert.equal(alert, null);
});

test("tendencia negativa: no se estima ningun plazo", () => {
  const alert = buildAlert(
    {
    player: player({ marketValue: 19_500_000, buyoutClause: 20_000_000 }),
    owner,
    history: risingHistory(20_000_000, -100_000, 7),
  }, NOW);

  assert.ok(alert);
  assert.equal(alert.calculated.estimatedDays, null);
  assert.equal(alert.calculated.missingReason, "tendencia_no_positiva");
});

test("subida fuerte pero lejos de la clausula: INFORMATIVA", () => {
  const alert = buildAlert(
    {
    // 10M de valor contra 40M de clausula: 25%, lejisimos de cualquier umbral.
    player: player({ marketValue: 10_000_000, buyoutClause: 40_000_000 }),
    owner,
    // 100.000/dia sobre 10M = 1% diario, por encima del minimo del 0,5%.
    history: risingHistory(9_400_000, 100_000, 7),
  }, NOW);

  assert.ok(alert);
  assert.equal(alert.level, "INFORMATIVA");
});

test("subida debil y lejos: no genera ninguna alerta", () => {
  const alert = buildAlert(
    {
    player: player({ marketValue: 10_000_000, buyoutClause: 40_000_000 }),
    owner,
    // 10.000/dia sobre 10M = 0,1% diario, por debajo del minimo.
    history: risingHistory(9_940_000, 10_000, 7),
  }, NOW);

  assert.equal(alert, null);
});

test("classify respeta el orden de precedencia de los umbrales", () => {
  // El ratio de valor manda sobre la estimacion de dias.
  assert.equal(classify(THRESHOLDS.criticalValueRatio, 30, 0), "CRITICA");
  assert.equal(classify(THRESHOLDS.highValueRatio, 30, 0), "ALTA");
  assert.equal(classify(0.5, THRESHOLDS.highDays, null), "ALTA");
  assert.equal(classify(0.5, THRESHOLDS.mediumDays, null), "MEDIA");
  assert.equal(classify(0.5, 30, THRESHOLDS.infoMinDailyRiseRatio), "INFORMATIVA");
  assert.equal(classify(0.5, 30, 0), null);
});

test("buildClauseAlerts ordena por urgencia y descarta lo que no alerta", () => {
  const owned: OwnedPlayer[] = [
    {
      player: player({ id: "lejos", marketValue: 10_000_000, buyoutClause: 40_000_000 }),
      owner,
      history: risingHistory(9_940_000, 10_000, 7), // no alerta
    },
    {
      player: player({ id: "media", marketValue: 18_200_000, buyoutClause: 20_000_000 }),
      owner,
      history: risingHistory(16_100_000, 350_000, 7),
    },
    {
      player: player({ id: "critica", marketValue: 19_500_000, buyoutClause: 20_000_000 }),
      owner,
      history: [],
    },
  ];

  const alerts = buildClauseAlerts(owned, NOW);

  assert.deepEqual(
    alerts.map((alert) => alert.player.id),
    ["critica", "media"],
  );
});

// --- Frescura del historico -------------------------------------------------
//
// Estos tests salen de un fallo REAL encontrado el 2026-08-13 pidiendo el
// endpoint publico de cotizacion: devolvia 360 puntos diarios que terminaban el
// 2026-06-30, 44 dias antes. La ventana de tendencia se mide respecto al ultimo
// punto de la SERIE, no respecto a hoy, asi que la app calculaba la pendiente de
// finales de junio y la presentaba como "subida reciente", con su estimacion de
// dias incluida.

test("historico congelado: no hay tendencia ni dias estimados, y se dice por que", () => {
  // Serie que sube con fuerza pero termina hace 44 dias (el caso real medido).
  const frozen = risingHistory(16_100_000, 350_000, 7).map((point, index) => ({
    ...point,
    date: new Date(Date.UTC(2026, 5, 24) + index * 86_400_000).toISOString().slice(0, 10),
  }));

  const alert = buildAlert(
    {
      player: player({ marketValue: 18_200_000, buyoutClause: 20_000_000 }),
      owner,
      history: frozen,
    },
    NOW,
  );

  assert.ok(alert);
  // La alerta SIGUE existiendo: valor y clausula son datos de hoy, no de la serie.
  assert.equal(alert.level, "ALTA");
  // Pero la parte que dependeria de una pendiente vieja desaparece.
  assert.equal(alert.calculated.dailyTrend, null);
  assert.equal(alert.calculated.dailyTrendRatio, null);
  assert.equal(alert.calculated.estimatedDays, null);
  assert.equal(alert.calculated.missingReason, "historico_desactualizado");
  // Y se expone hasta donde llega el dato, para poder decirlo en pantalla.
  assert.equal(alert.calculated.historyLatestDate, "2026-06-30");
  assert.ok(alert.calculated.historyAgeDays !== null);
  assert.ok(alert.calculated.historyAgeDays > 40);
});

test("un dia de retraso no invalida la tendencia: seria demasiado estricto", () => {
  const yesterday = risingHistory(16_100_000, 350_000, 7).map((point, index) => ({
    ...point,
    date: new Date(Date.UTC(2026, 7, 6) + index * 86_400_000).toISOString().slice(0, 10),
  }));

  const alert = buildAlert(
    {
      player: player({ marketValue: 18_200_000, buyoutClause: 20_000_000 }),
      owner,
      history: yesterday,
    },
    NOW,
  );

  assert.ok(alert);
  assert.equal(alert.calculated.dailyTrend, 350_000);
  assert.ok(alert.calculated.historyAgeDays !== null);
  assert.ok(alert.calculated.historyAgeDays <= MAX_HISTORY_AGE_DAYS);
});

test("una cotizacion congelada no puede colar una INFORMATIVA por subida vieja", () => {
  // Lejos de la clausula: sin tendencia no hay nada que alertar. Antes del fix,
  // la subida de junio generaba una INFORMATIVA como si estuviera pasando ahora.
  const frozen = risingHistory(9_400_000, 100_000, 7).map((point, index) => ({
    ...point,
    date: new Date(Date.UTC(2026, 5, 24) + index * 86_400_000).toISOString().slice(0, 10),
  }));

  const alert = buildAlert(
    {
      player: player({ marketValue: 10_000_000, buyoutClause: 40_000_000 }),
      owner,
      history: frozen,
    },
    NOW,
  );

  assert.equal(alert, null);
});

/*
 * Blindaje: cuantos dias faltan para que se pueda pagar la clausula.
 *
 * El dato es de LALIGA y la resta es nuestra. Lo que estos tests fijan es que
 * cuando LALIGA NO manda la fecha, la app no se la inventa.
 */

test("los dias de blindaje salen de la fecha que publica LALIGA", () => {
  const alert = buildAlert(
    { player: player({ isShielded: true, shieldedUntil: "2026-08-17T12:00:00.000Z" }), owner, history: [] },
    NOW,
  );
  assert.equal(alert?.official.daysUntilUnshielded, 4);
  assert.equal(alert?.official.shieldedUntil, "2026-08-17T12:00:00.000Z");
});

test("una fecha futura bloquea aunque isShielded venga falso", () => {
  const alert = buildAlert(
    { player: player({ isShielded: false, shieldedUntil: "2026-08-17T12:00:00.000Z" }), owner, history: [] },
    NOW,
  );
  assert.equal(alert?.official.isShielded, true);
});

test("una fecha pasada desbloquea aunque isShielded venga desfasado", () => {
  const alert = buildAlert(
    { player: player({ isShielded: true, shieldedUntil: "2026-08-01T00:00:00.000Z" }), owner, history: [] },
    NOW,
  );
  assert.equal(alert?.official.isShielded, false);
});

test("sin fecha publicada no se estima ningun plazo", () => {
  const alert = buildAlert({ player: player({ isShielded: true }), owner, history: [] }, NOW);
  assert.equal(alert?.official.shieldedUntil, null);
  assert.equal(alert?.official.daysUntilUnshielded, null);
});

test("una fecha ya pasada son cero dias, no dias negativos", () => {
  const alert = buildAlert(
    { player: player({ isShielded: true, shieldedUntil: "2026-08-01T00:00:00.000Z" }), owner, history: [] },
    NOW,
  );
  assert.equal(alert?.official.daysUntilUnshielded, 0);
});

test("una fecha ilegible se trata como ausente, no rompe la alerta", () => {
  const alert = buildAlert(
    { player: player({ isShielded: true, shieldedUntil: "manana por la tarde" }), owner, history: [] },
    NOW,
  );
  assert.equal(alert?.official.daysUntilUnshielded, null);
});
