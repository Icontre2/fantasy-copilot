/**
 * Actividad económica de la liga: el libro de operaciones que LALIGA sí publica.
 *
 * `GET /leagues/{id}/activity/{pagina}` devuelve compras, ventas y traspasos con
 * importe exacto. Las subidas manuales de cláusula no aparecen identificadas de
 * forma fiable en ese historial, así que se calculan aparte desde la plantilla
 * actual y SIEMPRE se etiquetan como estimación.
 */

/** Saldo con el que arranca cada manager la competición. */
export const SALDO_INICIAL = 100_000_000;

/** Cada punto Fantasy conseguido aporta esta cantidad. */
export const EUROS_POR_PUNTO = 100_000;

/** Importe de la recompensa diaria que puede reclamarse. */
export const RECOMPENSA_DIARIA = 100_000;

/**
 * LALIGA permite subir 2 € de cláusula gastando 1 € de presupuesto.
 * Fuente funcional: regla 2:1 de las cláusulas de LALIGA Fantasy.
 */
export const CLAUSE_EUROS_PER_BUDGET_EURO = 2;

/**
 * Regla automática de cláusula usada como suelo para NO atribuir a una subida
 * manual lo que podría venir del propio sistema. Por encima de 1 M€, LALIGA
 * parte de ~166% del valor de mercado; por debajo, 1 M€.
 *
 * Se usa como estimación conservadora, no como dato histórico exacto.
 */
export function automaticClauseBaseline(marketValue: number): number {
  if (!Number.isFinite(marketValue) || marketValue <= 0) return 0;
  if (marketValue < 1_000_000) return 1_000_000;
  return Math.round(marketValue * 1.66);
}

/** Códigos verificados contra la app oficial. */
export const ACTIVITY_TYPE = {
  /** Traspaso entre dos managers: `user1` paga, `user2` cobra. */
  TRASPASO: 1,
  /** Compra al mercado de LALIGA. */
  COMPRA: 31,
  /** Clausula entre managers: `user1` paga, `user2` cobra. */
  CLAUSULA: 32,
  /** Venta al mercado de LALIGA. */
  VENTA: 33,
} as const;

export type ActivityEntry = {
  id: string;
  activityTypeId: number;
  /** Protagonista. En un traspaso, quien PAGA. */
  user1Id?: string;
  /** Solo en traspasos: quien COBRA. */
  user2Id?: string;
  playerMasterId?: string;
  /** Importe en euros. Publicado por LALIGA, no inferido. */
  amount?: number;
  createdAt: string;
};

/** Un apunte del libro de un manager. Positivo entra, negativo sale. */
export type LedgerEntry = {
  activityId: string;
  occurredAt: string;
  kind: 'COMPRA' | 'VENTA' | 'TRASPASO_PAGADO' | 'TRASPASO_COBRADO' | 'CLAUSULA_PAGADA' | 'CLAUSULA_COBRADA';
  amount: number;
  playerId?: string;
  playerName?: string;
  /** El otro manager, en un traspaso. */
  counterpartyId?: string;
};

export type ClauseInvestment = {
  playerId: string;
  playerName: string;
  marketValue: number;
  buyoutClause: number;
  /** Suelo que no atribuimos a una subida manual. */
  baselineClause: number;
  /** Parte de cláusula por encima del suelo. */
  estimatedManualIncrease: number;
  /** `estimatedManualIncrease / 2`. Sale de la caja. */
  estimatedSpend: number;
};

export type ManagerEconomy = {
  managerId: string;
  managerName: string;

  saldoInicial: number;
  /** Suma de lo gastado en compras y traspasos pagados. NO incluye blindajes. */
  compras: number;
  /** Suma de lo ingresado por ventas y traspasos cobrados. */
  ventas: number;
  puntos: number;
  bonusPuntos: number;

  /**
   * Presupuesto estimado invertido en subir cláusulas de la plantilla actual.
   * Se muestra aparte para no confundirlo con fichajes.
   */
  gastoClausulasEstimado: number;
  clauseInvestments: ClauseInvestment[];

  /** Ventas − compras + puntos − blindajes estimados. */
  flujoConocido: number;
  /** `inicial + flujoConocido`. */
  cajaReconstruida: number;
  cajaOficial: number | null;
  diferencia: number | null;
  recompensasQueCuadrarian: number | null;

  entries: LedgerEntry[];
};

function toLedgerEntries(entry: ActivityEntry): { managerId: string; entry: LedgerEntry }[] {
  const amount = entry.amount ?? 0;
  const base = { activityId: entry.id, occurredAt: entry.createdAt, playerId: entry.playerMasterId };

  if (entry.activityTypeId === ACTIVITY_TYPE.COMPRA && entry.user1Id) {
    return [{ managerId: entry.user1Id, entry: { ...base, kind: 'COMPRA', amount: -amount } }];
  }
  if (entry.activityTypeId === ACTIVITY_TYPE.VENTA && entry.user1Id) {
    return [{ managerId: entry.user1Id, entry: { ...base, kind: 'VENTA', amount } }];
  }
  if (entry.activityTypeId === ACTIVITY_TYPE.TRASPASO && entry.user1Id && entry.user2Id) {
    return [
      {
        managerId: entry.user1Id,
        entry: { ...base, kind: 'TRASPASO_PAGADO', amount: -amount, counterpartyId: entry.user2Id },
      },
      {
        managerId: entry.user2Id,
        entry: { ...base, kind: 'TRASPASO_COBRADO', amount, counterpartyId: entry.user1Id },
      },
    ];
  }
  if (entry.activityTypeId === ACTIVITY_TYPE.CLAUSULA && entry.user1Id && entry.user2Id) {
    return [
      {
        managerId: entry.user1Id,
        entry: { ...base, kind: 'CLAUSULA_PAGADA', amount: -amount, counterpartyId: entry.user2Id },
      },
      {
        managerId: entry.user2Id,
        entry: { ...base, kind: 'CLAUSULA_COBRADA', amount, counterpartyId: entry.user1Id },
      },
    ];
  }
  return [];
}

export type BuildInput = {
  managers: {
    managerId: string;
    managerName: string;
    puntos: number;
    cajaOficial: number | null;
    /** Plantilla actual para estimar inversión en blindaje. */
    clausePlayers?: {
      id: string;
      name: string;
      marketValue: number;
      buyoutClause?: number;
    }[];
  }[];
  activity: ActivityEntry[];
  playerNames?: ReadonlyMap<string, string>;
};

function estimateClauseInvestments(
  players: NonNullable<BuildInput['managers'][number]['clausePlayers']>,
  entries: LedgerEntry[],
): ClauseInvestment[] {
  /**
   * Si el manager pagó más que la cláusula automática al adquirir al jugador,
   * ese precio puede explicar una cláusula inicial alta. Lo usamos como segundo
   * suelo para no llamar "subida manual" a dinero que fue realmente fichaje.
   */
  const lastAcquisitionByPlayer = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.playerId || entry.amount >= 0) continue;
    lastAcquisitionByPlayer.set(entry.playerId, Math.abs(entry.amount));
  }

  return players.flatMap((player) => {
    const clause = player.buyoutClause;
    if (!Number.isSafeInteger(clause) || clause <= 0) return [];
    if (!Number.isSafeInteger(player.marketValue) || player.marketValue <= 0) return [];

    const automatic = automaticClauseBaseline(player.marketValue);
    const acquisition = lastAcquisitionByPlayer.get(player.id) ?? 0;
    const baselineClause = Math.max(automatic, acquisition);
    const estimatedManualIncrease = Math.max(0, clause - baselineClause);
    if (estimatedManualIncrease <= 0) return [];

    return [{
      playerId: player.id,
      playerName: player.name,
      marketValue: player.marketValue,
      buyoutClause: clause,
      baselineClause,
      estimatedManualIncrease,
      estimatedSpend: Math.round(estimatedManualIncrease / CLAUSE_EUROS_PER_BUDGET_EURO),
    }];
  }).sort((a, b) => b.estimatedSpend - a.estimatedSpend);
}

export function buildEconomy(input: BuildInput): ManagerEconomy[] {
  const porManager = new Map<string, LedgerEntry[]>();
  const seen = new Set<string>();
  for (const raw of input.activity) {
    if (seen.has(raw.id)) continue;
    seen.add(raw.id);
    if (raw.amount !== undefined && (!Number.isSafeInteger(raw.amount) || raw.amount <= 0)) continue;
    for (const { managerId, entry } of toLedgerEntries(raw)) {
      if (entry.amount === 0) continue;
      if (entry.playerId) entry.playerName = input.playerNames?.get(entry.playerId);
      const list = porManager.get(managerId) ?? [];
      list.push(entry);
      porManager.set(managerId, list);
    }
  }

  return input.managers.map((manager) => {
    const entries = (porManager.get(manager.managerId) ?? []).sort((a, b) =>
      a.occurredAt.localeCompare(b.occurredAt),
    );

    const compras = entries
      .filter((entry) => entry.amount < 0)
      .reduce((total, entry) => total - entry.amount, 0);
    const ventas = entries
      .filter((entry) => entry.amount > 0)
      .reduce((total, entry) => total + entry.amount, 0);

    const clauseInvestments = estimateClauseInvestments(manager.clausePlayers ?? [], entries);
    const gastoClausulasEstimado = clauseInvestments.reduce((sum, item) => sum + item.estimatedSpend, 0);

    const bonusPuntos = manager.puntos * EUROS_POR_PUNTO;
    const flujoConocido = -compras + ventas + bonusPuntos - gastoClausulasEstimado;
    const cajaReconstruida = SALDO_INICIAL + flujoConocido;
    const diferencia = manager.cajaOficial === null ? null : manager.cajaOficial - cajaReconstruida;

    const recompensasQueCuadrarian =
      diferencia !== null && diferencia > 0 && diferencia % RECOMPENSA_DIARIA === 0
        ? diferencia / RECOMPENSA_DIARIA
        : null;

    return {
      managerId: manager.managerId,
      managerName: manager.managerName,
      saldoInicial: SALDO_INICIAL,
      compras,
      ventas,
      puntos: manager.puntos,
      bonusPuntos,
      gastoClausulasEstimado,
      clauseInvestments,
      flujoConocido,
      cajaReconstruida,
      cajaOficial: manager.cajaOficial,
      diferencia,
      recompensasQueCuadrarian,
      entries,
    };
  });
}
