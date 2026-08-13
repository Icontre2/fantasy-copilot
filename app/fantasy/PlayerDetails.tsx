"use client";

import { useEffect, useState } from "react";
import { get } from "./api";
import { millions, UNKNOWN } from "./format";
import type { MarketValuePoint, Player } from "./types";
import { PlayerImage } from "./PlayerImage";

export function PlayerDetails({ player, onClose }: { player: Player; onClose: () => void }) {
  const [history, setHistory] = useState<MarketValuePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    get<{ history: MarketValuePoint[] }>(`/api/fantasy/players/${encodeURIComponent(player.id)}/history`)
      .then((data) => setHistory(data.history.slice(-90)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "No se pudo cargar el histórico."));
  }, [player.id]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Ficha de ${player.name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3"><PlayerImage player={player} size={72} /><div><h2 className="text-xl font-bold">{player.name}</h2><p className="text-sm text-neutral-500">{player.position} · {player.team}</p></div></div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl" aria-label="Cerrar">×</button>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Valor" value={millions(player.marketValue)} /><Stat label="Puntos" value={String(player.points)} /><Stat label="Media" value={String(player.averagePoints)} /><Stat label="Año pasado" value={player.lastSeasonPoints === undefined ? UNKNOWN : String(player.lastSeasonPoints)} />
        </dl>
        <h3 className="mt-6 font-semibold">Valor últimos 90 días</h3>
        {history.length > 1 ? <HistoryChart points={history} /> : <p className="mt-3 text-sm text-neutral-500">{error ?? "Cargando histórico…"}</p>}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-neutral-50 p-3"><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>; }

function HistoryChart({ points }: { points: MarketValuePoint[] }) {
  const values = points.map((point) => point.marketValue); const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(1, max - min);
  const path = points.map((point, index) => `${index ? "L" : "M"}${(index / (points.length - 1)) * 100},${38 - ((point.marketValue - min) / span) * 36}`).join(" ");
  return <div className="mt-3"><svg viewBox="0 0 100 40" className="h-44 w-full overflow-visible" preserveAspectRatio="none" aria-label="Evolución del valor de mercado"><path d={path} fill="none" stroke="#7357ff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg><div className="flex justify-between text-xs text-neutral-500"><span>{new Date(points[0]!.date).toLocaleDateString("es-ES")}</span><span>{millions(points.at(-1)!.marketValue)}</span></div></div>;
}
