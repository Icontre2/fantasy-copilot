"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Clock3, ShieldCheck, TriangleAlert } from "lucide-react";
import { days, millions, percent, signedMillions, UNKNOWN } from "./format";
import type { AlertsResponse, ClauseAlert, Player } from "./types";
import { DataNotes, Empty } from "./ui";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";

const LEVEL_STYLE: Record<ClauseAlert["level"], string> = {
  CRITICA: "bg-rose-100 text-rose-700",
  ALTA: "bg-orange-100 text-orange-800",
  MEDIA: "bg-amber-100 text-amber-800",
  INFORMATIVA: "bg-neutral-100 text-neutral-600",
};

const LEVEL_LABEL: Record<ClauseAlert["level"], string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Media",
  INFORMATIVA: "Info",
};

export function AlertsView({ data }: { data: AlertsResponse }) {
  const [level, setLevel] = useState<ClauseAlert["level"] | "TODAS">("TODAS");
  const [selected, setSelected] = useState<Player | null>(null);
  const counts = useMemo(() => new Map((["CRITICA", "ALTA", "MEDIA", "INFORMATIVA"] as const).map((option) => [option, data.alerts.filter((alert) => alert.level === option).length])), [data.alerts]);
  const visible = level === "TODAS" ? data.alerts : data.alerts.filter((alert) => alert.level === level);

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-[28px] bg-[#101a39] p-5 text-white shadow-[0_22px_65px_rgba(12,22,52,.2)]">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-white/45">Protege tu mercado</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Alertas de cláusula</h2><p className="mt-2 text-sm leading-5 text-white/55">Jugadores cuyo valor se acerca peligrosamente a su cláusula.</p></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d6ff75] text-[#101a39]"><TriangleAlert size={22}/></span></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><Summary label="Alertas activas" value={String(data.alerts.length)}/><Summary label="Con cláusula" value={String(data.playersWithClause)}/></div>
    </section>

    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label="Filtrar alertas">
      {(["TODAS", "CRITICA", "ALTA", "MEDIA", "INFORMATIVA"] as const).map((option) => {
        const count = option === "TODAS" ? data.alerts.length : counts.get(option) ?? 0;
        return <button key={option} type="button" onClick={() => setLevel(option)} className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-bold transition ${level === option ? "bg-[#101a39] text-white shadow-lg" : "bg-white text-neutral-500 shadow-sm"}`} aria-pressed={level === option}>{option === "TODAS" ? "Todas" : LEVEL_LABEL[option]} <span className="ml-1 opacity-55">{count}</span></button>;
      })}
    </div>

    {visible.length === 0 ? <Empty>Ningún jugador cumple este criterio ahora mismo.</Empty> : <div className="space-y-3">{visible.map((alert) => <AlertCard key={`${alert.owner.teamId}-${alert.player.id}`} alert={alert} onSelect={setSelected}/>)}</div>}

    <p className="rounded-2xl bg-white px-4 py-3 text-xs leading-5 text-neutral-400 shadow-sm">
      {data.playersWithoutClause} sin cláusula publicada · {data.skippedForBudget} fuera del límite de consultas
      {data.historyFailures > 0 ? ` · ${data.historyFailures} sin histórico` : ""}
    </p>
    <DataNotes notes={data.dataNotes}/>
    {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)}/> : null}
  </div>;
}

function AlertCard({ alert, onSelect }: { alert: ClauseAlert; onSelect: (player: Player) => void }) {
  return <article className="rounded-[26px] bg-white p-4 shadow-[0_10px_35px_rgba(16,26,57,.07)]">
    <button type="button" onClick={() => onSelect(alert.player)} className="flex w-full items-center gap-3 text-left" aria-label={`Ver histórico de ${alert.player.name}`}>
      <PlayerImage player={alert.player} size={52}/>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-bold text-[#101a39]">{alert.player.name}</p>{alert.official.isShielded ? <ShieldCheck size={15} className="shrink-0 text-emerald-600"/> : null}</div><p className="truncate text-xs text-neutral-400">{alert.player.position} · {alert.player.team} · {alert.owner.managerName}</p></div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${LEVEL_STYLE[alert.level]}`}>{LEVEL_LABEL[alert.level]}</span>
    </button>
    <div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Valor" value={millions(alert.official.marketValue)}/><Metric label="Cláusula" value={millions(alert.official.buyoutClause)} accent/></div>
    <div className="mt-2 grid grid-cols-3 gap-2"><CompactMetric icon={<ArrowUpRight size={13}/>} label="Subida/día" value={signedMillions(alert.calculated.dailyTrend)}/><CompactMetric label="Cubierta" value={percent(alert.calculated.valueToClauseRatio)}/><CompactMetric icon={<Clock3 size={13}/>} label="Estimación" value={alert.calculated.estimatedDays !== null ? days(alert.calculated.estimatedDays) : UNKNOWN}/></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100"><div className={`h-full rounded-full ${alert.alreadyReachable ? "bg-rose-500" : "bg-[#a7d84d]"}`} style={{ width: `${Math.min(100, Math.max(4, alert.calculated.valueToClauseRatio * 100))}%` }}/></div>
    <p className={`mt-2 text-xs font-medium ${alert.alreadyReachable ? "text-rose-600" : "text-neutral-400"}`}>{alert.alreadyReachable ? "El valor ya alcanza o supera la cláusula" : `Faltan ${millions(Math.max(0, alert.calculated.gap))}`}</p>
  </article>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white/10 p-3"><p className="text-[10px] text-white/45">{label}</p><p className="mt-1 text-xl font-bold text-[#d6ff75]">{value}</p></div>; }
function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`rounded-2xl p-3 ${accent ? "bg-[#efffc9]" : "bg-[#f4f6f8]"}`}><p className="text-[10px] text-neutral-400">{label}</p><p className="mt-1 font-bold text-[#101a39]">{value}</p></div>; }
function CompactMetric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) { return <div className="min-w-0 rounded-2xl bg-[#f7f8fa] px-2 py-2 text-center"><p className="flex items-center justify-center gap-1 truncate text-[9px] text-neutral-400">{icon}{label}</p><p className="mt-1 truncate text-[11px] font-bold text-[#101a39]">{value}</p></div>; }
