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
    // Se comprueba que venga una lista antes de guardarla: una respuesta sin
    // `history` (endpoint caido, cuerpo raro) tumbaba la ficha entera con un
    // "Cannot read properties of undefined". Un histórico que falta es un hueco,
    // no una pantalla rota.
    get<{ history?: MarketValuePoint[] }>(`/api/fantasy/players/${encodeURIComponent(player.id)}/history`)
      .then((data) => {
        if (Array.isArray(data.history)) setHistory(data.history);
        else setError("LALIGA no ha devuelto el histórico de este jugador.");
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "No se pudo cargar el histórico."));
  }, [player.id]);
  const visible = useMemo(() => days === "MAX" ? history : history.slice(-days), [days, history]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Ficha de ${player.name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[30px] glass-sheet p-5 text-white sm:rounded-[30px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3"><PlayerImage player={player} size={72} /><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Ficha de jugador</p><h2 className="text-xl font-bold text-white">{player.name}</h2><p className="text-sm text-neutral-500">{player.position} · {player.team}</p></div></div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/8 text-white" aria-label="Cerrar"><X size={18}/></button>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Valor" value={millions(player.marketValue)} /><Stat label="Puntos" value={String(player.points)} /><Stat label="Media" value={String(player.averagePoints)} /><Stat label="Año pasado" value={player.lastSeasonPoints === undefined ? UNKNOWN : String(player.lastSeasonPoints)} />
        </dl>
        <div className="mt-6"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Mercado</p><h3 className="font-bold text-white">Evolución del valor</h3><div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-white/[.04] p-1">{([7, 30, 90, "MAX"] as const).map((option) => <button key={String(option)} type="button" onClick={() => setDays(option)} aria-pressed={days === option} className={`min-h-11 rounded-lg px-2 text-xs font-bold ${days === option ? "bg-[#7c3aed] text-white" : "text-neutral-500"}`}>{option === "MAX" ? "Todo" : `${option}D`}</button>)}</div></div>
        {visible.length > 1 ? <HistoryChart points={visible} marketValue={player.marketValue} /> : <p className="mt-3 glass-soft rounded-2xl p-5 text-center text-sm leading-5 text-neutral-500">{error ?? "Cargando histórico…"}</p>}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="glass-soft rounded-2xl p-3"><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-white">{value}</dd></div>; }

/**
 * Evolucion del valor, con las DOS fechas y un aviso si la serie esta vieja.
 *
 * Antes solo se rotulaba la fecha inicial y el ultimo importe, y eso escondia el
 * problema de raiz: el historico lo publica el host PUBLICO de LALIGA, que ahora
 * mismo va por la temporada pasada — la serie termina el 30/06/2026 — mientras
 * que el valor de arriba viene de tu plantilla y es de hoy. Asi se leian juntos
 * "17,1 M€" y una curva que acababa en "1,67 M€" como si se contradijeran,
 * cuando son simplemente dos temporadas distintas.
 *
 * No se corrige el numero ni se oculta la curva: se dice de cuando es cada cosa.
 */
function HistoryChart({ points, marketValue }: { points: MarketValuePoint[]; marketValue: number }) {
  const values = points.map((point) => point.marketValue); const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(1, max - min);
  const path = points.map((point, index) => `${index ? "L" : "M"}${(index / (points.length - 1)) * 100},${38 - ((point.marketValue - min) / span) * 36}`).join(" ");
  const ultimo = points.at(-1)!;
  // El reloj no se lee en el render: es impuro y el linter de React lo rechaza.
  const [ahora] = useState(() => Date.now());
  const vieja = (ahora - Date.parse(ultimo.date)) / 86_400_000 > MAX_DIAS_FRESCA;
  return <div className="mt-3 glass-soft rounded-2xl p-4">
    <svg viewBox="0 0 100 40" className="h-44 w-full overflow-visible" preserveAspectRatio="none" aria-label="Evolución del valor de mercado"><path d={path} fill="none" stroke={vieja ? "#a1a1aa" : "#8b5cf6"} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <div className="flex justify-between gap-2 text-xs text-neutral-500">
      <span>{fecha(points[0]!.date)}</span>
      <span className="text-right"><span className="font-bold text-white">{millions(ultimo.marketValue)}</span> · {fecha(ultimo.date)}</span>
    </div>
    {vieja && (
      <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] leading-4 text-amber-300">
        Esta curva es de la <strong>temporada pasada</strong>: LALIGA dejó de publicar cotización el{" "}
        {fecha(ultimo.date)} y todavía no ha empezado la de esta. Por eso acaba en{" "}
        {millions(ultimo.marketValue)} y arriba pone {millions(marketValue)}, que sí es el valor de hoy.
      </p>
    )}
  </div>;
}

/** Días que puede tener el último dato antes de considerarlo de otra temporada. */
const MAX_DIAS_FRESCA = 7;

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
