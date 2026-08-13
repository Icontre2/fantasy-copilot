"use client";

import { useState } from "react";
import { millions, shortDate, signedMillions, UNKNOWN } from "./format";
import type { EconomyResponse, ManagerLedger, SyncResponse } from "./types";
import { Card, DataNotes, Empty, ErrorBox, SectionTitle, TableWrap, Td, Th } from "./ui";
import { post } from "./api";
import { AutoSyncPanel } from "./AutoSyncPanel";

/**
 * Economía: cuánto dinero tiene cada manager y de dónde sale.
 *
 * La columna que manda es "Saldo oficial": la publica LALIGA. El resto es el
 * desglose calculado por esta app, y "Saldo previo" es explícitamente el
 * residuo — lo que ya tenía antes de empezar a mirar, más lo no explicado.
 */
export function EconomyView({
  data,
  leagueId,
  onSynced,
}: {
  data: EconomyResponse;
  leagueId: string;
  onSynced: () => void;
}) {
  const [openManagerId, setOpenManagerId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await post<SyncResponse>(`/api/fantasy/leagues/${leagueId}/economy/sync`);
      setSyncResult(result);
      onSynced();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "No se pudo sincronizar.");
    } finally {
      setSyncing(false);
    }
  }

  const open = data.ledgers.find((ledger) => ledger.managerId === openManagerId);

  // Sin base de datos no hay histórico posible. Se explica y se para aquí: una
  // tabla vacía con ceros parecería un resultado ("nadie ha movido dinero")
  // cuando en realidad es "no lo estamos midiendo".
  if (data.storageRequired) {
    return (
      <div className="space-y-4">
        <Card>
          <SectionTitle>Economía de la liga</SectionTitle>
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Esta pantalla necesita base de datos y no hay ninguna configurada. Las otras cuatro
            funcionan sin ella.
          </p>
        </Card>
        <DataNotes notes={data.dataNotes} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>Economía de la liga</SectionTitle>
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {syncing ? "Sincronizando…" : "Sincronizar ahora"}
          </button>
        </div>

        {data.schedule && (
          <div className="mb-3">
            <AutoSyncPanel leagueId={leagueId} status={data.schedule} onChanged={onSynced} />
          </div>
        )}

        {syncError && <div className="mb-3"><ErrorBox message={syncError} /></div>}

        {syncResult && (
          <p className="mb-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            {syncResult.hadPreviousSnapshot
              ? `Foto tomada. ${syncResult.detectedTransactions} operación(es) detectadas, ${syncResult.storedTransactions} nuevas.`
              : "Primera foto de esta liga guardada. A partir de ahora se podrán detectar operaciones comparando con ella."}
          </p>
        )}

        {data.trackedSince ? (
          <p className="mb-3 text-sm text-neutral-600">
            Movimientos registrados desde el {shortDate(data.trackedSince)}. Lo anterior no es
            recuperable: LALIGA no publica histórico de operaciones.
          </p>
        ) : (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Todavía no hay ninguna sincronización de esta liga. Pulsa &laquo;Sincronizar ahora&raquo; para
            guardar la primera foto; el desglose empezará a partir de ella.
          </p>
        )}

        {data.ledgers.length === 0 ? (
          <Empty>No se ha podido leer ningún manager de esta liga.</Empty>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr>
                  <Th>Manager</Th>
                  <Th align="right">Saldo oficial</Th>
                  <Th align="right">Compras</Th>
                  <Th align="right">Ventas</Th>
                  <Th align="right">Bonus puntos</Th>
                  <Th align="right">Neto</Th>
                  <Th align="right">Saldo previo</Th>
                </tr>
              </thead>
              <tbody>
                {data.ledgers.map((ledger) => (
                  <tr
                    key={ledger.managerId}
                    className="cursor-pointer hover:bg-neutral-50"
                    onClick={() =>
                      setOpenManagerId(openManagerId === ledger.managerId ? null : ledger.managerId)
                    }
                  >
                    <Td className="font-medium">
                      {ledger.managerName}
                      {ledger.unattributedOperations > 0 && (
                        <span
                          className="ml-1 text-xs text-amber-700"
                          title={`${ledger.unattributedOperations} operación(es) sin importe atribuible`}
                        >
                          ⚠
                        </span>
                      )}
                    </Td>
                    <Td align="right" className="font-semibold">
                      {millions(ledger.officialBalance)}
                    </Td>
                    <Td align="right">{millions(ledger.purchases)}</Td>
                    <Td align="right">{millions(ledger.sales)}</Td>
                    <Td align="right">{millions(ledger.pointsBonus)}</Td>
                    <Td align="right">{signedMillions(ledger.net)}</Td>
                    <Td
                      align="right"
                      className={
                        // Un saldo previo NEGATIVO es imposible en la realidad:
                        // significa que le hemos atribuido más dinero del que
                        // tiene, o sea que se nos ha escapado una compra. Es una
                        // señal de que falta un movimiento, no un número más.
                        (ledger.openingBalance ?? 0) < 0 ? "text-red-700" : "text-neutral-500"
                      }
                    >
                      {millions(ledger.openingBalance)}
                      {(ledger.openingBalance ?? 0) < 0 && (
                        <span
                          className="ml-1"
                          title="Saldo previo negativo: hemos contabilizado más dinero del que tiene. Falta por detectar alguna compra, probablemente ocurrida entre dos sincronizaciones."
                        >
                          ⚠
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}

        <p className="mt-2 text-xs text-neutral-500">
          Toca un manager para auditar su libro. &laquo;Saldo previo&raquo; = saldo oficial − neto conocido.
        </p>
      </Card>

      {open && <LedgerCard ledger={open} />}

      <DataNotes notes={data.dataNotes} />
    </div>
  );
}

const KIND_LABEL = { COMPRA: "Compra", VENTA: "Venta", PUNTOS: "Puntos" } as const;

/** Motivo por el que un importe no se conoce, en lenguaje llano. */
const BASIS_LABEL: Record<string, string> = {
  INFERRED_FROM_CASH_DELTA: "importe deducido de la variación de caja",
  NOT_ATTRIBUTABLE_MULTIPLE_OPERATIONS:
    "varias operaciones entre dos sincronizaciones: el importe no se puede repartir",
  UNKNOWN_CASH: "LALIGA no publicó el saldo en una de las dos fotos",
  CALCULO_100K_POR_PUNTO: "100.000 € por punto sobre el acumulado oficial",
};

function LedgerCard({ ledger }: { ledger: ManagerLedger }) {
  return (
    <Card>
      <SectionTitle>Libro de {ledger.managerName}</SectionTitle>

      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-neutral-500">Saldo oficial (LALIGA)</dt>
          <dd className="font-semibold">{millions(ledger.officialBalance)}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Saldo previo al seguimiento</dt>
          <dd className="font-semibold text-neutral-500">{millions(ledger.openingBalance)}</dd>
        </div>
      </dl>

      {ledger.entries.length === 0 ? (
        <Empty>
          Todavía no hay movimientos registrados de este manager. Aparecerán en cuanto haya dos
          sincronizaciones con algún cambio entre ellas.
        </Empty>
      ) : (
        <ul className="space-y-2">
          {ledger.entries.map((entry, index) => (
            <li
              key={`${entry.kind}-${entry.occurredAt}-${entry.playerId ?? entry.matchday ?? index}`}
              className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-2 text-sm"
            >
              <span>
                <strong>{KIND_LABEL[entry.kind]}</strong>{" "}
                {entry.kind === "PUNTOS"
                  ? `jornada ${entry.matchday}: ${entry.points} puntos`
                  : `jugador ${entry.playerId}`}
                <span className="block text-xs text-neutral-500">
                  {BASIS_LABEL[entry.basis] ?? entry.basis}
                </span>
              </span>
              <span
                className={`shrink-0 tabular-nums font-medium ${
                  entry.amount === null
                    ? "text-neutral-400"
                    : entry.amount > 0
                      ? "text-green-700"
                      : "text-red-700"
                }`}
              >
                {entry.amount === null ? UNKNOWN : signedMillions(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
