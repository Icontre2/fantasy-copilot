"use client";

import { useState } from "react";
import { millions, shortDate, signedMillions, UNKNOWN } from "./format";
import type { EconomyResponse, ManagerEconomy } from "./types";
import { Card, DataNotes, Empty, SectionTitle, TableWrap, Td, Th } from "./ui";

/**
 * Economía: de dónde sale el dinero de cada manager.
 *
 * Todos parten de los mismos 100 M€, así que la caja se explica entera con las
 * operaciones que publica LALIGA. La cifra que manda sigue siendo la oficial
 * cuando existe; la reconstruida está para EXPLICARLA, no para sustituirla.
 *
 * La diferencia entre ambas se enseña siempre. Es la parte que la actividad
 * disponible no cubre, y esconderla convertiría un dato incompleto en uno falso.
 */
export function EconomyView({ data }: { data: EconomyResponse }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const detalle = data.economies.find((economy) => economy.managerId === abierto);

  if (data.economies.length === 0) {
    return <Empty>No se ha podido leer ningún manager de esta liga.</Empty>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Economía de la liga</SectionTitle>

        <p className="mb-3 text-sm text-neutral-600">
          Todos empezaron con <strong>{millions(data.saldoInicial)}</strong>.{" "}
          {data.actividadDesde
            ? `Actividad conocida desde el ${shortDate(data.actividadDesde)} (${data.operaciones} operaciones).`
            : "LALIGA no ha devuelto operaciones de esta liga."}
        </p>

        <TableWrap>
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <Th>Manager</Th>
                <Th align="right">Caja</Th>
                <Th align="right">Compras</Th>
                <Th align="right">Ventas</Th>
                <Th align="right">Puntos</Th>
                <Th align="right">Diferencia</Th>
              </tr>
            </thead>
            <tbody>
              {data.economies.map((economy) => (
                <tr
                  key={economy.managerId}
                  className="cursor-pointer hover:bg-neutral-50"
                  onClick={() => setAbierto(abierto === economy.managerId ? null : economy.managerId)}
                >
                  <Td className="font-medium">
                    {economy.managerName}
                    {economy.cajaOficial === null && (
                      <span className="ml-1 text-[10px] font-normal text-neutral-400">calculada</span>
                    )}
                  </Td>
                  <Td align="right" className="font-semibold">
                    {millions(economy.cajaOficial ?? economy.cajaReconstruida)}
                  </Td>
                  <Td align="right" className="text-red-700">−{millions(economy.compras)}</Td>
                  <Td align="right" className="text-green-700">+{millions(economy.ventas)}</Td>
                  <Td align="right">{millions(economy.bonusPuntos)}</Td>
                  <Td align="right" className={economy.diferencia === null ? "text-neutral-400" : "text-neutral-600"}>
                    {economy.diferencia === null ? UNKNOWN : signedMillions(economy.diferencia)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>

        <p className="mt-2 text-xs text-neutral-500">
          Toca un manager para ver su libro. «Calculada» = LALIGA no publica su caja, así que es
          nuestra reconstrucción y su diferencia no se puede comprobar.
        </p>
      </Card>

      {detalle && <LibroCard economy={detalle} saldoInicial={data.saldoInicial} />}

      <DataNotes notes={data.dataNotes} />
    </div>
  );
}

const KIND_LABEL: Record<ManagerEconomy["entries"][number]["kind"], string> = {
  COMPRA: "Compra",
  VENTA: "Venta",
  TRASPASO_PAGADO: "Fichaje pagado",
  TRASPASO_COBRADO: "Traspaso cobrado",
};

function LibroCard({ economy, saldoInicial }: { economy: ManagerEconomy; saldoInicial: number }) {
  return (
    <Card>
      <SectionTitle>Libro de {economy.managerName}</SectionTitle>

      {/* El cuadre completo, línea a línea, para poder auditar cada euro. */}
      <dl className="mb-4 space-y-1 text-sm">
        <Linea label="Saldo inicial" value={millions(saldoInicial)} />
        <Linea label="Compras" value={`−${millions(economy.compras)}`} tone="red" />
        <Linea label="Ventas" value={`+${millions(economy.ventas)}`} tone="green" />
        <Linea
          label={`Puntos (${economy.puntos} × 100.000 €)`}
          value={`+${millions(economy.bonusPuntos)}`}
          tone="green"
        />
        <Linea label="Caja reconstruida" value={millions(economy.cajaReconstruida)} strong />

        {economy.cajaOficial !== null ? (
          <>
            <Linea label="Caja oficial (LALIGA)" value={millions(economy.cajaOficial)} strong />
            <Linea
              label="Diferencia"
              value={signedMillions(economy.diferencia)}
              tone={economy.diferencia === 0 ? "green" : undefined}
            />
          </>
        ) : (
          <p className="pt-2 text-xs text-neutral-500">
            LALIGA no publica la caja de otros managers, así que no hay cifra oficial contra la que
            comprobar esta reconstrucción.
          </p>
        )}
      </dl>

      {economy.recompensasQueCuadrarian !== null && (
        <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
          La diferencia encaja exactamente con{" "}
          <strong>{economy.recompensasQueCuadrarian} recompensas diarias</strong> de 100.000 €. Es
          una lectura posible, no un dato: LALIGA no publica quién las reclama.
        </p>
      )}

      {economy.entries.length === 0 ? (
        <Empty>Sin operaciones en el periodo que publica LALIGA.</Empty>
      ) : (
        <ul className="space-y-2">
          {economy.entries.map((entry) => (
            <li
              key={entry.activityId}
              className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-2 text-sm"
            >
              <span>
                <strong>{KIND_LABEL[entry.kind]}</strong>
                <span className="block text-xs text-neutral-500">
                  {shortDate(entry.occurredAt)}
                  {entry.playerId ? ` · jugador ${entry.playerId}` : ""}
                </span>
              </span>
              <span
                className={`shrink-0 tabular-nums font-medium ${
                  entry.amount > 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {signedMillions(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Linea({
  label,
  value,
  tone,
  strong = false,
}: {
  label: string;
  value: string;
  tone?: "red" | "green";
  strong?: boolean;
}) {
  const color = tone === "red" ? "text-red-700" : tone === "green" ? "text-green-700" : "";
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "border-t border-neutral-200 pt-1" : ""}`}>
      <dt className={strong ? "font-semibold" : "text-neutral-600"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold" : ""} ${color}`}>{value}</dd>
    </div>
  );
}
