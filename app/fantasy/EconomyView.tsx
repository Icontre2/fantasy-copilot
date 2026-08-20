"use client";

import { useState } from "react";
import { millions, shortDate, signedMillions, UNKNOWN } from "./format";
import type { EconomyResponse, ManagerEconomy } from "./types";
import { DataNotes, Empty } from "./ui";

export function EconomyView({ data }: { data: EconomyResponse }) {
  const [abierto, setAbierto] = useState<string | null>(null);

  if (data.economies.length === 0) {
    return <Empty>No se ha podido leer ningún manager de esta liga.</Empty>;
  }

  return (
    <div className="space-y-4">
      <section className="glass-strong overflow-hidden rounded-[28px] p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">De dónde sale el dinero</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">Economía</h2>

        <p className="mt-2 text-sm leading-5 text-white/55">
          Todos empezaron con <strong>{millions(data.saldoInicial)}</strong>.{" "}
          {data.actividadDesde
            ? `Historial completo desde el ${shortDate(data.actividadDesde)} (${data.operaciones} entradas).`
            : "LALIGA no ha devuelto operaciones de esta liga."}
        </p>

        <ul className="mt-4 space-y-2">
          {data.economies.map((economy) => {
            const abiertoAqui = abierto === economy.managerId;
            const displayedCash = economy.cajaOficial ?? economy.cajaReconstruida;
            return (
              <li key={economy.managerId}>
                <button
                  type="button"
                  onClick={() => setAbierto(abiertoAqui ? null : economy.managerId)}
                  aria-expanded={abiertoAqui}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    abiertoAqui ? "border-[#7c3aed]/50 bg-[#7c3aed]/10" : "border-white/10 bg-white/[.03]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-white">{economy.managerName}</span>
                      {economy.cajaOficial === null && (
                        <span className="block truncate text-[10px] text-neutral-500">
                          Reconstrucción propia · no usa valor de equipo
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[9px] uppercase tracking-wider text-neutral-500">
                        {economy.cajaOficial === null ? "Caja aprox." : "Caja oficial"}
                      </span>
                      <span
                        className={`block tabular-nums font-bold ${
                          displayedCash >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {economy.cajaOficial === null ? "≈ " : ""}{millions(displayedCash)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5 text-[11px]">
                    <Dato label="Compras" value={millions(economy.compras)} tone="rose" />
                    <Dato label="Ventas" value={millions(economy.ventas)} tone="emerald" />
                    <Dato label="Puntos" value={millions(economy.bonusPuntos)} />
                    <Dato
                      label="Cláusulas est."
                      value={economy.gastoClausulasEstimado > 0 ? `−${millions(economy.gastoClausulasEstimado)}` : millions(0)}
                      tone={economy.gastoClausulasEstimado > 0 ? "rose" : undefined}
                    />
                    <Dato
                      label="Dif."
                      value={economy.diferencia === null ? UNKNOWN : signedMillions(economy.diferencia)}
                    />
                  </div>
                </button>

                {abiertoAqui && <LibroCard economy={economy} saldoInicial={data.saldoInicial} />}
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs leading-4 text-white/45">
          Toca un manager para ver su libro. El gasto de cláusulas es una estimación separada de los
          fichajes y se descuenta de la caja reconstruida. El valor de la plantilla no cuenta como caja.
        </p>
      </section>

      <DataNotes notes={data.dataNotes} />
    </div>
  );
}

const KIND_LABEL: Record<ManagerEconomy["entries"][number]["kind"], string> = {
  COMPRA: "Compra",
  VENTA: "Venta",
  TRASPASO_PAGADO: "Fichaje pagado",
  TRASPASO_COBRADO: "Traspaso cobrado",
  CLAUSULA_PAGADA: "Cláusula pagada",
  CLAUSULA_COBRADA: "Cláusula cobrada",
};

function LibroCard({ economy, saldoInicial }: { economy: ManagerEconomy; saldoInicial: number }) {
  return (
    <section className="glass-soft mt-2 rounded-[22px] p-4 text-white">
      <h3 className="mb-3 text-[15px] font-bold tracking-tight">Libro de {economy.managerName}</h3>

      <dl className="mb-4 space-y-1 text-sm">
        <Linea label="Saldo inicial" value={millions(saldoInicial)} />
        <Linea label="Compras" value={`−${millions(economy.compras)}`} tone="rose" />
        <Linea label="Ventas" value={`+${millions(economy.ventas)}`} tone="emerald" />
        <Linea
          label={`Puntos (${economy.puntos} × 100.000 €)`}
          value={`+${millions(economy.bonusPuntos)}`}
          tone="emerald"
        />
        <Linea
          label="Subida de cláusulas (est.)"
          value={`−${millions(economy.gastoClausulasEstimado)}`}
          tone={economy.gastoClausulasEstimado > 0 ? "rose" : undefined}
        />
        <Linea label="Saldo de operaciones" value={signedMillions(economy.flujoConocido)} strong />
        <Linea label="Caja reconstruida" value={millions(economy.cajaReconstruida)} />

        {economy.cajaOficial !== null ? (
          <>
            <Linea label="Caja oficial (LALIGA)" value={millions(economy.cajaOficial)} strong />
            <Linea
              label="Diferencia"
              value={signedMillions(economy.diferencia)}
              tone={economy.diferencia === 0 ? "emerald" : undefined}
            />
          </>
        ) : (
          <p className="pt-2 text-xs text-neutral-500">
            LALIGA no publica la caja de otros managers. La reconstrucción usa operaciones, puntos y una
            estimación del dinero invertido en blindar cláusulas.
          </p>
        )}
      </dl>

      {economy.clauseInvestments.length > 0 && (
        <div className="mb-4 rounded-2xl border border-rose-500/15 bg-rose-500/[.05] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-rose-200">Blindaje de cláusulas estimado</p>
            <span className="text-xs font-bold tabular-nums text-rose-300">
              −{millions(economy.gastoClausulasEstimado)}
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-4 text-neutral-500">
            Regla 1:2: subir 2 M€ de cláusula cuesta 1 M€ de caja. Solo contamos la parte que supera
            el suelo automático o el último precio de adquisición conocido.
          </p>
          <ul className="mt-3 space-y-2">
            {economy.clauseInvestments.map((item) => (
              <li key={item.playerId} className="flex items-start justify-between gap-3 text-xs">
                <span className="min-w-0">
                  <strong className="block truncate text-neutral-200">{item.playerName}</strong>
                  <span className="block text-[10px] text-neutral-500">
                    Cláusula {millions(item.buyoutClause)} · base {millions(item.baselineClause)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums font-semibold text-rose-300">
                  −{millions(item.estimatedSpend)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {economy.recompensasQueCuadrarian !== null && (
        <p className="mb-4 rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 p-3 text-xs text-[#c4b5fd]">
          La diferencia encaja exactamente con{" "}
          <strong>{economy.recompensasQueCuadrarian} recompensas diarias</strong> de 100.000 €. Es
          una lectura posible, no un dato: LALIGA no publica quién las reclama.
        </p>
      )}

      {economy.entries.length === 0 ? (
        <Empty>Sin operaciones publicadas para este manager.</Empty>
      ) : (
        <ul className="space-y-2">
          {economy.entries.map((entry) => (
            <li
              key={entry.activityId}
              className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 text-sm"
            >
              <span>
                <strong>{KIND_LABEL[entry.kind]}</strong>
                <span className="block text-xs text-neutral-500">
                  {shortDate(entry.occurredAt)}
                  {entry.playerName ? ` · ${entry.playerName}` : entry.playerId ? ` · jugador ${entry.playerId}` : ""}
                </span>
              </span>
              <span
                className={`shrink-0 tabular-nums font-medium ${
                  entry.amount > 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {signedMillions(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Dato({ label, value, tone }: { label: string; value: string; tone?: "rose" | "emerald" }) {
  const color = tone === "rose" ? "text-rose-400" : tone === "emerald" ? "text-emerald-400" : "text-neutral-300";
  return (
    <span className="min-w-0">
      <span className="block truncate text-[10px] text-neutral-500">{label}</span>
      <span className={`block truncate tabular-nums font-semibold ${color}`}>{value}</span>
    </span>
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
  tone?: "rose" | "emerald";
  strong?: boolean;
}) {
  const color = tone === "rose" ? "text-rose-400" : tone === "emerald" ? "text-emerald-400" : "";
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "border-t border-white/10 pt-1" : ""}`}>
      <dt className={strong ? "font-semibold" : "text-neutral-400"}>{label}</dt>
      <dd className={`shrink-0 whitespace-nowrap tabular-nums ${strong ? "font-semibold" : ""} ${color}`}>{value}</dd>
    </div>
  );
}
