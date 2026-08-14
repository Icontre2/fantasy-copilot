"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { get } from "./api";
import { millions, UNKNOWN } from "./format";
import type { MarketValuePoint, Player } from "./types";
import { PlayerImage } from "./PlayerImage";

export function PlayerDetails({ player, onClose }: { player: Player; onClose: () => void }) {
  const [history, setHistory] = useState<MarketValuePoint[]>([]);
  const [days, setDays] = useState<7 | 30 | 90 | "MAX">(30);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    get<{ history: MarketValuePoint[] }>(`/api/fantasy/players/${encodeURIComponent(player.id)}/history`)
      .then((data) => setHistory(data.history))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "No se pudo cargar el histórico."));
  }, [player.id]);
  const visible = useMemo(() => days === "MAX" ? history : history.slice(-days), [days, history]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Ficha de ${player.name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[30px] border border-white/10 bg-[#121214] p-5 text-white shadow-2xl sm:rounded-[30px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3"><PlayerImage player={player} size={72} /><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Ficha de jugador</p><h2 className="text-xl font-bold text-white">{player.name}</h2><p className="text-sm text-neutral-500">{player.position} · {player.team}</p></div></div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/8 text-white" aria-label="Cerrar"><X size={18}/></button>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Valor" value={millions(player.marketValue)} /><Stat label="Puntos" value={String(player.points)} /><Stat label="Media" value={String(player.averagePoints)} /><Stat label="Año pasado" value={player.lastSeasonPoints === undefined ? UNKNOWN : String(player.lastSeasonPoints)} />
        </dl>
        <div className="mt-6"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Mercado</p><h3 className="font-bold text-white">Evolución del valor</h3><div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-white/[.04] p-1">{([7, 30, 90, "MAX"] as const).map((option) => <button key={String(option)} type="button" onClick={() => setDays(option)} aria-pressed={days === option} className={`min-h-11 rounded-lg px-2 text-xs font-bold ${days === option ? "bg-[#7c3aed] text-white" : "text-neutral-500"}`}>{option === "MAX" ? "Todo" : `${option}D`}</button>)}</div></div>
        {visible.length > 1 ? <HistoryChart points={visible} /> : <p className="mt-3 rounded-2xl bg-white/[.04] p-5 text-center text-sm text-neutral-500">{error ?? "Cargando histórico…"}</p>}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/[.04] p-3"><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-white">{value}</dd></div>; }

function HistoryChart({ points }: { points: MarketValuePoint[] }) {
  const values = points.map((point) => point.marketValue); const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(1, max - min);
  const path = points.map((point, index) => `${index ? "L" : "M"}${(index / (points.length - 1)) * 100},${38 - ((point.marketValue - min) / span) * 36}`).join(" ");
  return <div className="mt-3 rounded-2xl bg-white/[.04] p-4"><svg viewBox="0 0 100 40" className="h-44 w-full overflow-visible" preserveAspectRatio="none" aria-label="Evolución del valor de mercado"><path d={path} fill="none" stroke="#8b5cf6" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="flex justify-between text-xs text-neutral-500"><span>{new Date(points[0]!.date).toLocaleDateString("es-ES")}</span><span className="font-bold text-white">{millions(points.at(-1)!.marketValue)}</span></div></div>;
}
