import { createHash } from 'node:crypto';
import { EUROS_PER_POINT } from './points.ts';

/**
 * Deteccion de operaciones economicas de la liga.
 *
 * ── El problema ──────────────────────────────────────────────────────────────
 * LALIGA Fantasy **no publica ningun historial de operaciones**. No hay endpoint
 * de compras, ni de ventas, ni de pujas resueltas, ni `winningPrice`, ni
 * `winningManager` (comprobado; ver `docs/AUDITORIA_FASE_1.md`). Lo unico
 * observable en cada momento es una FOTO: quien tiene a quien, cuanta caja tiene
 * cada manager y quien esta en el mercado.
 *
 * ── La solucion, y lo que cuesta ─────────────────────────────────────────────
 * Se comparan dos fotos consecutivas y se deduce que paso entre medias:
 *
 *   jugador que pasa de la plantilla de A a la de B  -> traspaso entre managers
 *   jugador que estaba en el mercado y aparece en B  -> compra al mercado
 *   jugador que sale de A y no aparece en nadie      -> venta al mercado
 *
 * El IMPORTE no es observable en ningun caso: se INFIERE de cuanto vario la caja
 * del manager, descontando antes el ingreso por puntos de ese mismo intervalo.
 * Esa inferencia solo es atribuible a una operacion concreta si el manager hizo
 * **exactamente una** en el intervalo. Con dos o mas, el importe agregado sigue
 * siendo correcto pero el reparto por jugador ya no: en ese caso el importe se
 * deja en `null` con motivo, en vez de repartirlo a partes iguales.
 *
 * Consecuencia que hay que aceptar y contar en la UI: **el ledger empieza el dia
 * de la primera sincronizacion**. Lo anterior no se puede recuperar.
 */

export type TransactionType =
  /** El jugador cambia de una plantilla a otra: compra directa o clausula pagada. */
  | 'TRANSFER_BETWEEN_MANAGERS'
  /** Estaba en el mercado y ahora tiene dueno. */
  | 'BUY_FROM_MARKET'
  /** Sale de una plantilla y no aparece en ninguna otra. */
  | 'SELL_TO_MARKET'
  /** Aparece en una plantilla sin que se le viera antes en ningun sitio. */
  | 'ACQUISITION_UNKNOWN_ORIGIN';

/** Por que el importe es el que es, o por que no se sabe. */
export type AmountBasis =
  /** Deducido de la variacion de caja del manager. Es un calculo, no un dato. */
  | 'INFERRED_FROM_CASH_DELTA'
  /** El manager hizo varias operaciones en el intervalo: no se puede repartir. */
  | 'NOT_ATTRIBUTABLE_MULTIPLE_OPERATIONS'
  /** Falta `teamMoney` en alguna de las dos fotos. */
  | 'UNKNOWN_CASH';

export type ManagerState = {
  managerId: string;
  managerName: string;
  teamId: string;
  /** Caja en euros. `null` si la API no la publico en esa foto. */
  teamMoney: number | null;
  /** Puntos acumulados de temporada. `null` si no se publico. */
  teamPoints: number | null;
  playerIds: string[];
};

/** Una foto completa del estado economico de la liga en un instante. */
export type EconomySnapshot = {
  leagueId: string;
  /** ISO 8601. Identifica la foto y forma parte de la clave anti-duplicados. */
  capturedAt: string;
  weekNumber: number | null;
  managers: ManagerState[];
  /** Jugadores a la venta en el mercado en ese instante. */
  marketPlayerIds: string[];
};

export type DetectedTransaction = {
  /** Clave estable anti-duplicados. Ver `buildExternalId`. */
  externalId: string;
  leagueId: string;
  type: TransactionType;
  /** Momento en que se OBSERVO. La operacion real ocurrio entre las dos fotos. */
  occurredAt: string;
  observedBetween: { from: string; to: string };
  buyerManagerId?: string;
  sellerManagerId?: string;
  playerId: string;
  /** Importe en euros. `null` cuando no es atribuible: no se rellena con 0. */
  amount: number | null;
  amountBasis: AmountBasis;
};

/**
 * Identificador estable de una operacion detectada.
 *
 * LALIGA no da ids de operacion, asi que se construye un hash de lo que
 * identifica al evento: liga, tipo, jugador, quien lo suelta, quien lo coge y
 * **la foto ANTERIOR** desde la que se detecto.
 *
 * Se usa `from` y no `to` a proposito: si la sincronizacion se repite contra la
 * misma foto previa, la foto nueva tendra otro `capturedAt` (es otra descarga)
 * pero el evento detectado es el mismo. Incluir `to` generaria un id distinto
 * cada vez y el `ON CONFLICT` de la tabla no protegeria de nada.
 */
export function buildExternalId(input: {
  leagueId: string;
  type: TransactionType;
  playerId: string;
  sellerManagerId?: string;
  buyerManagerId?: string;
  from: string;
}): string {
  const parts = [
    input.leagueId,
    input.type,
    input.playerId,
    input.sellerManagerId ?? '',
    input.buyerManagerId ?? '',
    input.from,
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

type Movement = {
  type: TransactionType;
  playerId: string;
  buyerManagerId?: string;
  sellerManagerId?: string;
};

/** Que operaciones ocurrieron, sin mirar todavia el dinero. */
function detectMovements(previous: EconomySnapshot, current: EconomySnapshot): Movement[] {
  const ownerBefore = new Map<string, string>();
  for (const manager of previous.managers) {
    for (const playerId of manager.playerIds) ownerBefore.set(playerId, manager.managerId);
  }

  const ownerAfter = new Map<string, string>();
  for (const manager of current.managers) {
    for (const playerId of manager.playerIds) ownerAfter.set(playerId, manager.managerId);
  }

  const wasOnMarket = new Set(previous.marketPlayerIds);
  const movements: Movement[] = [];

  for (const [playerId, buyer] of ownerAfter) {
    const seller = ownerBefore.get(playerId);
    if (seller === buyer) continue;

    if (seller) {
      movements.push({ type: 'TRANSFER_BETWEEN_MANAGERS', playerId, buyerManagerId: buyer, sellerManagerId: seller });
    } else if (wasOnMarket.has(playerId)) {
      movements.push({ type: 'BUY_FROM_MARKET', playerId, buyerManagerId: buyer });
    } else {
      // Ni tenia dueno ni estaba en el mercado en la foto anterior. Puede ser un
      // fichaje resuelto entre dos sincronizaciones sin pasar por una foto del
      // mercado. Se registra con el tipo que dice justamente eso.
      movements.push({ type: 'ACQUISITION_UNKNOWN_ORIGIN', playerId, buyerManagerId: buyer });
    }
  }

  for (const [playerId, seller] of ownerBefore) {
    if (!ownerAfter.has(playerId)) {
      movements.push({ type: 'SELL_TO_MARKET', playerId, sellerManagerId: seller });
    }
  }

  return movements;
}

/**
 * Cuanto vario la caja de cada manager por operaciones, una vez descontado el
 * ingreso por puntos del mismo intervalo.
 *
 *   cashDelta   = teamMoney_ahora - teamMoney_antes
 *   pointsDelta = (teamPoints_ahora - teamPoints_antes) * 100.000
 *   trading     = cashDelta - pointsDelta     <- lo que movieron las operaciones
 *
 * `null` si falta `teamMoney` en cualquiera de las dos fotos: sin los dos
 * extremos no hay variacion que calcular.
 */
function tradingDeltaByManager(previous: EconomySnapshot, current: EconomySnapshot): Map<string, number | null> {
  const before = new Map(previous.managers.map((manager) => [manager.managerId, manager]));
  const deltas = new Map<string, number | null>();

  for (const manager of current.managers) {
    const prior = before.get(manager.managerId);
    if (!prior || manager.teamMoney === null || prior.teamMoney === null) {
      deltas.set(manager.managerId, null);
      continue;
    }

    const cashDelta = manager.teamMoney - prior.teamMoney;
    const pointsDelta =
      manager.teamPoints !== null && prior.teamPoints !== null
        ? (manager.teamPoints - prior.teamPoints) * EUROS_PER_POINT
        : 0;

    deltas.set(manager.managerId, cashDelta - pointsDelta);
  }

  return deltas;
}

/**
 * Compara dos fotos y devuelve las operaciones detectadas, con el importe
 * inferido cuando es atribuible.
 *
 * El importe se intenta deducir primero del lado del COMPRADOR y, si ese
 * manager hizo varias operaciones, del lado del VENDEDOR: en una operacion entre
 * managers el importe es el mismo por los dos lados, asi que basta con que uno
 * de los dos haya hecho solo esa.
 */
export function detectTransactions(
  previous: EconomySnapshot,
  current: EconomySnapshot,
): DetectedTransaction[] {
  const movements = detectMovements(previous, current);
  const trading = tradingDeltaByManager(previous, current);

  // Cuantas operaciones toca cada manager en este intervalo.
  const operationCount = new Map<string, number>();
  for (const movement of movements) {
    for (const managerId of [movement.buyerManagerId, movement.sellerManagerId]) {
      if (managerId) operationCount.set(managerId, (operationCount.get(managerId) ?? 0) + 1);
    }
  }

  /** Importe deducible desde un manager concreto, si es el unico que hizo. */
  function amountFrom(managerId: string | undefined): number | null {
    if (!managerId) return null;
    if (operationCount.get(managerId) !== 1) return null;
    const delta = trading.get(managerId);
    if (delta === null || delta === undefined) return null;
    return Math.abs(delta);
  }

  return movements.map((movement) => {
    const fromBuyer = amountFrom(movement.buyerManagerId);
    const fromSeller = fromBuyer === null ? amountFrom(movement.sellerManagerId) : null;
    const amount = fromBuyer ?? fromSeller;

    let amountBasis: AmountBasis;
    if (amount !== null) {
      amountBasis = 'INFERRED_FROM_CASH_DELTA';
    } else {
      // Distinguir "no se puede repartir" de "no hay dato de caja": son
      // limitaciones distintas y la UI las explica distinto.
      const sides = [movement.buyerManagerId, movement.sellerManagerId].filter(
        (id): id is string => id !== undefined,
      );
      const anyCashKnown = sides.some((id) => trading.get(id) !== null && trading.get(id) !== undefined);
      amountBasis = anyCashKnown ? 'NOT_ATTRIBUTABLE_MULTIPLE_OPERATIONS' : 'UNKNOWN_CASH';
    }

    return {
      externalId: buildExternalId({
        leagueId: current.leagueId,
        type: movement.type,
        playerId: movement.playerId,
        sellerManagerId: movement.sellerManagerId,
        buyerManagerId: movement.buyerManagerId,
        from: previous.capturedAt,
      }),
      leagueId: current.leagueId,
      type: movement.type,
      occurredAt: current.capturedAt,
      observedBetween: { from: previous.capturedAt, to: current.capturedAt },
      buyerManagerId: movement.buyerManagerId,
      sellerManagerId: movement.sellerManagerId,
      playerId: movement.playerId,
      amount,
      amountBasis,
    };
  });
}
