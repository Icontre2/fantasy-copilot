"use client";

import { useState } from "react";
import { millions, shortDate, signedMillions, UNKNOWN } from "./format";
import type { EconomyResponse, ManagerEconomy } from "./types";
import { DataNotes, Empty } from "./ui";

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
            ? `Actividad conocida desde el ${shortDate(data.actividadDesde)} (${data.operaciones} operaciones).`
            : "LALIGA no ha devuelto operaciones de esta liga."}
        </p>

        {/*
          Tarjetas, no tabla.

          Eran seis columnas en 390 px: cabian tres y el resto quedaba detras de
          un scroll horizontal que en un movil no se ve. La misma informacion en
          tarjeta se lee entera de un vistazo, que es lo que pide
          docs/DIRECCION_VISUAL.md.
        */}
        <ul className="mt-4 space-y-2">
          {data.economies.map((economy) => {
            const abiertoAqui = abierto === economy.managerId;
            const displayedCash = economy.cajaOficial ?? economy.cajaReconstruida + (data.estimationError ?? 0);
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
                          Estimación corregida · no usa valor de equipo
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
                  <div className="mt-2 grid grid-cols-4 gap-2 text-[11px]">
                    <Dato label="Compras" value={millions(economy.compras)} tone="rose" />
                    <Dato label="Ventas" value={millions(economy.ventas)} tone="emerald" />
                    <Dato label="Puntos" value={millions(economy.bonusPuntos)} />
                    <Dato
                      label="Dif."
                      value={economy.diferencia === null ? UNKNOWN : signedMillions(economy.diferencia)}
                    />
                  </div>
                </button>

                {/*
                  El libro se abre AQUI, debajo del manager que has tocado. Antes
                  salia al final de la pantalla y en un movil parecia que el
                  toque no habia hecho nada.
                */}
                {abiertoAqui && <LibroCard economy={economy} saldoInicial={data.saldoInicial} />}
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs leading-4 text-white/45">
          Toca un manager para ver su libro. La caja aproximada puede ser negativa, no incluye el valor
          del equipo y corrige el hueco del historial con el error medido en tu propia caja.
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
};

function LibroCard({ economy, saldoInicial }: { economy: ManagerEconomy; saldoInicial: number }) {
  return (
    <section className="glass-soft mt-2 rounded-[22px] p-4 text-white">
      <h3 className="mb-3 text-[15px] font-bold tracking-tight">Libro de {economy.managerName}</h3>

      {/* El cuadre completo, línea a línea, para poder auditar cada euro. */}
      <dl className="mb-4 space-y-1 text-sm">
        <Linea label="Saldo inicial" value={millions(saldoInicial)} />
        <Linea label="Compras" value={`−${millions(economy.compras)}`} tone="rose" />
        <Linea label="Ventas" value={`+${millions(economy.ventas)}`} tone="emerald" />
        <Linea
          label={`Puntos (${economy.puntos} × 100.000 €)`}
          value={`+${millions(economy.bonusPuntos)}`}
          tone="emerald"
        />
        {/* Mismo nombre que en la fila de arriba: dos rotulos para la misma cifra confunden. */}
        <Linea label="Saldo de operaciones" value={signedMillions(economy.flujoConocido)} strong />
        <Linea label="Saldo teórico si el historial fuese completo" value={millions(economy.cajaReconstruida)} />

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
            LALIGA no publica la caja de otros managers. El saldo teórico no es su caja real si faltan
            movimientos anteriores al primer registro disponible.
          </p>
        )}
      </dl>

      {economy.recompensasQueCuadrarian !== null && (
        <p className="mb-4 rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 p-3 text-xs text-[#c4b5fd]">
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
