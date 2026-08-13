import assert from "node:assert/strict";
import test from "node:test";
import {
  describeSchedule,
  EXPECTED_SYNC_INTERVAL_MINUTES,
  isAuthorizedCronRequest,
  type SyncSubscription,
} from "./schedule-status.ts";

/**
 * Se prueba la parte pura: como se traduce una suscripcion a un diagnostico
 * mostrable, y la autorizacion del cron. `runScheduledSyncs` toca red y base de
 * datos, y se valida a mano contra una liga real (ver `docs/TRASPASO.md`).
 */

const NOW = new Date("2026-08-13T12:00:00.000Z");

function subscription(overrides: Partial<SyncSubscription> = {}): SyncSubscription {
  return {
    leagueId: "1",
    leagueName: "Liga de prueba",
    enabled: true,
    lastRunAt: null,
    lastStatus: null,
    lastError: null,
    lastDetectedTransactions: null,
    consecutiveFailures: 0,
    ...overrides,
  };
}

/** Un ISO de hace `minutes` minutos respecto a NOW. */
function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

// --- Diagnostico mostrable --------------------------------------------------

test("sin suscripcion avisa de que el desglose solo avanza a mano", () => {
  const status = describeSchedule(null, NOW);
  assert.equal(status.health, "OFF");
  assert.match(status.message, /desactivada/);
});

test("una suscripcion desactivada es OFF aunque haya corrido antes", () => {
  const status = describeSchedule(subscription({ enabled: false, lastRunAt: minutesAgo(10) }), NOW);
  assert.equal(status.health, "OFF");
});

test("activada y sin correr todavia queda PENDING, no LATE", () => {
  const status = describeSchedule(subscription(), NOW);
  assert.equal(status.health, "PENDING");
  assert.equal(status.minutesSinceLastRun, null);
});

test("dentro del intervalo esperado es OK", () => {
  const status = describeSchedule(subscription({ lastRunAt: minutesAgo(30), lastStatus: "OK" }), NOW);
  assert.equal(status.health, "OK");
  assert.equal(status.minutesSinceLastRun, 30);
});

test("perder un solo ciclo NO se considera retraso: seria ruido por un despliegue", () => {
  const status = describeSchedule(
    subscription({ lastRunAt: minutesAgo(EXPECTED_SYNC_INTERVAL_MINUTES + 10), lastStatus: "OK" }),
    NOW,
  );
  assert.equal(status.health, "OK");
});

test("mas de dos ciclos sin correr es LATE y avisa del hueco", () => {
  const status = describeSchedule(
    subscription({ lastRunAt: minutesAgo(EXPECTED_SYNC_INTERVAL_MINUTES * 2 + 1), lastStatus: "OK" }),
    NOW,
  );
  assert.equal(status.health, "LATE");
  assert.match(status.message, /sin registrar/);
});

test("la sesion caducada para la sincronizacion y lo dice, en vez de fallar en silencio", () => {
  const status = describeSchedule(
    subscription({ lastRunAt: minutesAgo(5), lastStatus: "SESSION_EXPIRED" }),
    NOW,
  );
  assert.equal(status.health, "STOPPED");
  assert.match(status.message, /iniciar sesion/);
});

test("cinco fallos seguidos paran la suscripcion e incluyen el motivo", () => {
  const status = describeSchedule(
    subscription({
      lastRunAt: minutesAgo(5),
      lastStatus: "ERROR",
      lastError: "LALIGA respondio 503",
      consecutiveFailures: 5,
    }),
    NOW,
  );
  assert.equal(status.health, "STOPPED");
  assert.match(status.message, /LALIGA respondio 503/);
});

// --- Autorizacion del cron --------------------------------------------------

function withSecret(secret: string | undefined, header?: string): boolean {
  const previous = process.env.CRON_SECRET;
  if (secret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = secret;
  try {
    return isAuthorizedCronRequest(
      new Request("https://example.test/api/cron/economy-sync", {
        headers: header ? { authorization: header } : undefined,
      }),
    );
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
}

test("sin CRON_SECRET configurado deniega SIEMPRE, aunque no manden nada", () => {
  assert.equal(withSecret(undefined), false);
  assert.equal(withSecret(undefined, "Bearer loquesea"), false);
});

test("acepta el secreto correcto", () => {
  assert.equal(withSecret("s3cr3to", "Bearer s3cr3to"), true);
});

test("rechaza un secreto incorrecto, ausente o mal formado", () => {
  assert.equal(withSecret("s3cr3to", "Bearer otro"), false);
  assert.equal(withSecret("s3cr3to"), false);
  assert.equal(withSecret("s3cr3to", "s3cr3to"), false);
});

test("un prefijo del secreto no cuela", () => {
  assert.equal(withSecret("s3cr3to", "Bearer s3cr"), false);
});
