import { supabaseAdmin } from '@/src/server/storage/supabase-admin';
import { getCurrentWeek, getLeagueMarket, getLeagueSnapshot } from '../read.ts';
import { attributePoints, type PointIncomeRow, type RecordedPoints } from './points.ts';
import { detectTransactions, type DetectedTransaction, type EconomySnapshot } from './transactions.ts';
import { buildLedgers, type ManagerLedger } from './ledger.ts';

/**
 * Sincronizacion economica: toma una foto de la liga, la compara con la
 * anterior y persiste lo que haya cambiado.
 *
 * Toda la logica vive en servidor. El frontend no reconstruye nada: pide un
 * ledger ya hecho.
 *
 * Idempotencia, que es el requisito duro:
 *  - Las operaciones se insertan con `ON CONFLICT (league_id,
 *    transaction_external_id) DO NOTHING`.
 *  - El ingreso por puntos se escribe con UPSERT de valor absoluto.
 * Ejecutar esto dos veces seguidas no cambia nada la segunda vez.
 */

type SnapshotRow = { captured_at: string; payload: EconomySnapshot };

/** Construye la foto actual leyendo LALIGA. Es lo unico que hace red aqui. */
export async function captureSnapshot(accessToken: string, leagueId: string): Promise<EconomySnapshot> {
  const [league, market, week] = await Promise.all([
    getLeagueSnapshot(accessToken, leagueId),
    getLeagueMarket(accessToken, leagueId),
    // La jornada solo hace falta para etiquetar el ingreso por puntos: si falla,
    // la foto sigue siendo util para detectar operaciones.
    getCurrentWeek(accessToken).catch(() => null),
  ]);

  return {
    leagueId,
    capturedAt: new Date().toISOString(),
    weekNumber: week?.weekNumber ?? null,
    managers: league.teams.map((team) => ({
      managerId: team.manager.id,
      managerName: team.manager.name,
      teamId: team.teamId,
      teamMoney: team.teamMoney ?? null,
      teamPoints: team.teamPoints ?? null,
      playerIds: team.players.map((player) => player.id),
    })),
    marketPlayerIds: market.map((entry) => entry.player.id),
  };
}

async function readLatestSnapshot(leagueId: string): Promise<EconomySnapshot | null> {
  const { data } = await supabaseAdmin()
    .from('fantasy_league_snapshots')
    .select('captured_at, payload')
    .eq('league_id', leagueId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle<SnapshotRow>();
  return data?.payload ?? null;
}

async function readFirstSnapshotAt(leagueId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from('fantasy_league_snapshots')
    .select('captured_at')
    .eq('league_id', leagueId)
    .order('captured_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ captured_at: string }>();
  return data?.captured_at ?? null;
}

async function persistSnapshot(snapshot: EconomySnapshot): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('fantasy_league_snapshots')
    .upsert(
      {
        league_id: snapshot.leagueId,
        captured_at: snapshot.capturedAt,
        week_number: snapshot.weekNumber,
        payload: snapshot,
      },
      { onConflict: 'league_id,captured_at', ignoreDuplicates: true },
    );
  if (error) throw new Error(`No se pudo guardar la foto de la liga: ${error.message}`);
}

async function persistTransactions(transactions: DetectedTransaction[]): Promise<number> {
  if (transactions.length === 0) return 0;

  const { data, error } = await supabaseAdmin()
    .from('fantasy_transactions')
    .upsert(
      transactions.map((transaction) => ({
        league_id: transaction.leagueId,
        transaction_external_id: transaction.externalId,
        transaction_type: transaction.type,
        occurred_at: transaction.occurredAt,
        observed_from: transaction.observedBetween.from,
        observed_to: transaction.observedBetween.to,
        buyer_manager_id: transaction.buyerManagerId ?? null,
        seller_manager_id: transaction.sellerManagerId ?? null,
        player_id: transaction.playerId,
        amount: transaction.amount,
        amount_basis: transaction.amountBasis,
        raw_payload: transaction,
      })),
      { onConflict: 'league_id,transaction_external_id', ignoreDuplicates: true },
    )
    .select('id');

  if (error) throw new Error(`No se pudieron guardar las operaciones: ${error.message}`);
  return data?.length ?? 0;
}

/**
 * Escribe el ingreso por puntos de la jornada en curso para cada manager.
 *
 * Nunca suma: calcula el valor absoluto que corresponde a esa jornada a partir
 * del acumulado oficial y lo UPSERTea. Ver `points.ts` para el razonamiento.
 */
async function persistPointIncome(snapshot: EconomySnapshot): Promise<PointIncomeRow[]> {
  const matchday = snapshot.weekNumber;
  if (matchday === null) return [];

  const db = supabaseAdmin();
  const { data: recorded, error: readError } = await db
    .from('fantasy_point_income')
    .select('manager_id, matchday, points')
    .eq('league_id', snapshot.leagueId)
    .returns<{ manager_id: string; matchday: number; points: number }[]>();
  if (readError) throw new Error(`No se pudo leer el ingreso por puntos: ${readError.message}`);

  const byManager = new Map<string, RecordedPoints[]>();
  for (const row of recorded ?? []) {
    const list = byManager.get(row.manager_id) ?? [];
    list.push({ matchday: row.matchday, points: row.points });
    byManager.set(row.manager_id, list);
  }

  const rows = snapshot.managers
    .filter((manager) => manager.teamPoints !== null)
    .map((manager) =>
      attributePoints({
        leagueId: snapshot.leagueId,
        managerId: manager.managerId,
        matchday,
        totalPoints: manager.teamPoints as number,
        previouslyRecorded: byManager.get(manager.managerId) ?? [],
      }),
    );

  if (rows.length === 0) return [];

  const { error } = await db.from('fantasy_point_income').upsert(
    rows.map((row) => ({
      league_id: row.leagueId,
      manager_id: row.managerId,
      matchday: row.matchday,
      points: row.points,
      amount: row.amount,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'league_id,manager_id,matchday' },
  );
  if (error) throw new Error(`No se pudo guardar el ingreso por puntos: ${error.message}`);

  return rows;
}

export type SyncResult = {
  capturedAt: string;
  /** `false` la primera vez: sin foto anterior no hay nada que comparar. */
  hadPreviousSnapshot: boolean;
  detectedTransactions: number;
  storedTransactions: number;
  pointIncomeRows: number;
};

/** Ejecuta una sincronizacion completa de la liga. */
export async function syncLeagueEconomy(accessToken: string, leagueId: string): Promise<SyncResult> {
  const previous = await readLatestSnapshot(leagueId);
  const current = await captureSnapshot(accessToken, leagueId);

  // La foto se guarda SIEMPRE, incluso si no hay operaciones: es la referencia
  // contra la que se comparara la siguiente.
  await persistSnapshot(current);

  const detected = previous ? detectTransactions(previous, current) : [];
  const stored = await persistTransactions(detected);
  const pointIncome = await persistPointIncome(current);

  return {
    capturedAt: current.capturedAt,
    hadPreviousSnapshot: previous !== null,
    detectedTransactions: detected.length,
    storedTransactions: stored,
    pointIncomeRows: pointIncome.length,
  };
}

export type EconomyReport = {
  leagueId: string;
  trackedSince: string | null;
  ledgers: ManagerLedger[];
  /** Explicacion de los limites de estos numeros, para mostrarla tal cual. */
  dataNotes: string[];
};

type TransactionRow = {
  transaction_external_id: string;
  transaction_type: DetectedTransaction['type'];
  occurred_at: string;
  observed_from: string;
  observed_to: string;
  buyer_manager_id: string | null;
  seller_manager_id: string | null;
  player_id: string;
  amount: number | null;
  amount_basis: DetectedTransaction['amountBasis'];
};

/**
 * Ledger completo de la liga, leido de lo ya persistido mas el saldo oficial
 * en vivo. No sincroniza: lee. Para actualizar, primero `syncLeagueEconomy`.
 */
export async function buildEconomyReport(
  accessToken: string,
  leagueId: string,
): Promise<EconomyReport> {
  const db = supabaseAdmin();

  const [league, trackedSince, transactionRows, pointRows] = await Promise.all([
    getLeagueSnapshot(accessToken, leagueId),
    readFirstSnapshotAt(leagueId),
    db
      .from('fantasy_transactions')
      .select(
        'transaction_external_id, transaction_type, occurred_at, observed_from, observed_to, buyer_manager_id, seller_manager_id, player_id, amount, amount_basis',
      )
      .eq('league_id', leagueId)
      .order('occurred_at', { ascending: true })
      .returns<TransactionRow[]>(),
    db
      .from('fantasy_point_income')
      .select('manager_id, matchday, points, amount')
      .eq('league_id', leagueId)
      .returns<{ manager_id: string; matchday: number; points: number; amount: number }[]>(),
  ]);

  const transactions: DetectedTransaction[] = (transactionRows.data ?? []).map((row) => ({
    externalId: row.transaction_external_id,
    leagueId,
    type: row.transaction_type,
    occurredAt: row.occurred_at,
    observedBetween: { from: row.observed_from, to: row.observed_to },
    buyerManagerId: row.buyer_manager_id ?? undefined,
    sellerManagerId: row.seller_manager_id ?? undefined,
    playerId: row.player_id,
    amount: row.amount,
    amountBasis: row.amount_basis,
  }));

  const pointIncome: PointIncomeRow[] = (pointRows.data ?? []).map((row) => ({
    leagueId,
    managerId: row.manager_id,
    matchday: row.matchday,
    points: row.points,
    amount: row.amount,
  }));

  const ledgers = buildLedgers({
    managers: league.teams.map((team) => ({
      managerId: team.manager.id,
      managerName: team.manager.name,
      teamId: team.teamId,
      teamMoney: team.teamMoney ?? null,
    })),
    transactions,
    pointIncome,
    trackedSince,
  });

  const dataNotes = [
    'El saldo de la columna "Saldo oficial" lo publica LALIGA. No lo calcula esta app.',
    trackedSince
      ? `El desglose de movimientos empieza el ${trackedSince.slice(0, 10)}: LALIGA no publica historico de operaciones, asi que lo anterior a esa fecha no se puede recuperar.`
      : 'Todavia no hay ninguna sincronizacion guardada de esta liga: aun no hay movimientos que desglosar.',
    '"Saldo previo" es el saldo oficial menos lo que sabemos explicar. Incluye el dinero que ya tenia el manager antes de empezar el seguimiento y cualquier movimiento no detectado. NO es el saldo inicial de la liga: ese dato no lo publica la API.',
    'Los importes de compra y venta son CALCULADOS a partir de la variacion de caja, no publicados por LALIGA. Cuando un manager hace varias operaciones entre dos sincronizaciones, el importe no se reparte: queda sin atribuir.',
    'El bonus por puntos son 100.000 EUR por punto, aplicados sobre el acumulado oficial de cada manager.',
  ];

  return { leagueId, trackedSince, ledgers, dataNotes };
}
