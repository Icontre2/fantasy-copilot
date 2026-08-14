"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Clock3, Search, ShieldCheck, ShieldOff, TriangleAlert } from "lucide-react";
import { post } from "./api";
import { days, millions, percent, shortDate, signedMillions, UNKNOWN } from "./format";
import type { AlertsResponse, ClauseAlert, Player } from "./types";
import { DataNotes, Empty } from "./ui";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";

type Filter = "TODAS" | "CRITICAS" | "DESBLOQUEADAS" | "BLOQUEADAS" | "ALCANZABLES";
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "TODAS", label: "Todas" }, { id: "CRITICAS", label: "Críticas" },
  { id: "DESBLOQUEADAS", label: "Abiertas" }, { id: "ALCANZABLES", label: "≤ 7 días" },
  { id: "BLOQUEADAS", label: "Bloqueadas" },
];
const LEVEL_STYLE: Record<ClauseAlert["level"], string> = {
  CRITICA: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
  ALTA: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30",
  MEDIA: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  INFORMATIVA: "bg-white/5 text-neutral-400 ring-1 ring-white/10",
};

export function AlertsView({ data, onChanged }: { data: AlertsResponse; onChanged: () => void }) {
  const [filter, setFilter] = useState<Filter>("TODAS");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Player | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const visible = useMemo(() => data.alerts.filter((alert) => {
    const text = `${alert.player.name} ${alert.player.team} ${alert.owner.managerName}`.toLowerCase();
    if (!text.includes(query.trim().toLowerCase())) return false;
    if (filter === "CRITICAS") return alert.level === "CRITICA";
    if (filter === "DESBLOQUEADAS") return !alert.official.isShielded;
    if (filter === "BLOQUEADAS") return alert.official.isShielded;
    if (filter === "ALCANZABLES") return alert.calculated.estimatedDays !== null && alert.calculated.estimatedDays <= 7;
    return true;
  }), [data.alerts, filter, query]);

  async function buyout(alert: ClauseAlert) {
    if (!window.confirm(`Vas a pagar ${millions(alert.official.buyoutClause)} por ${alert.player.name}. Esta operación es irreversible. ¿Continuar?`)) return;
    setBusy(alert.player.id); setMessage(null);
    try {
      const result = await post<{ confirmed: boolean }>(`/api/fantasy/leagues/${encodeURIComponent(data.leagueId)}/players/${encodeURIComponent(alert.player.id)}/buyout`, { expectedClause: alert.official.buyoutClause, expectedOwnerId: alert.owner.managerId });
      setMessage(result.confirmed ? "Cláusula confirmada por LALIGA." : "LALIGA respondió, pero el fichaje aún no aparece. Actualiza antes de repetir.");
      onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo pagar la cláusula."); }
    finally { setBusy(null); }
  }

  return <div className="space-y-4">
    <section className="glass-strong overflow-hidden rounded-[28px] p-5 text-white">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Vigila las cláusulas</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Alertas</h2><p className="mt-2 text-sm leading-5 text-white/55">Datos oficiales, tendencia real y acción directa.</p></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#7c3aed] text-white"><TriangleAlert size={22}/></span></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><Summary label="Alertas activas" value={String(data.alerts.length)}/><Summary label="Con cláusula" value={String(data.playersWithClause)}/></div>
    </section>
    <label className="flex min-h-12 items-center gap-2 rounded-2xl glass px-4 text-neutral-500"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jugador, equipo o manager…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"/></label>
    {/* En rejilla y no en scroll lateral: asi no queda ningun filtro cortado por el borde. */}
    <div className="flex flex-wrap gap-2" aria-label="Filtrar alertas">{FILTERS.map((option) => <button key={option.id} type="button" onClick={() => setFilter(option.id)} aria-pressed={filter === option.id} className={`min-h-11 grow rounded-2xl px-3 text-sm font-bold ${filter === option.id ? "bg-[#7c3aed] text-white" : "glass text-neutral-500"}`}>{option.label}</button>)}</div>
    {message && <p className="rounded-2xl glass p-4 text-sm text-neutral-200" role="status">{message}</p>}
    {visible.length === 0 ? <Empty>Ningún jugador cumple este criterio ahora mismo.</Empty> : <div className="space-y-3">{visible.map((alert) => <AlertCard key={`${alert.owner.teamId}-${alert.player.id}`} alert={alert} mine={alert.owner.managerId === data.myManagerId} cash={data.myTeamMoney} busy={busy === alert.player.id} onSelect={setSelected} onBuyout={buyout}/>)}</div>}
    <p className="rounded-2xl glass px-4 py-3 text-xs leading-5 text-neutral-500">{data.playersWithoutClause} sin cláusula publicada · {data.skippedForBudget} fuera del límite de consultas{data.historyFailures > 0 ? ` · ${data.historyFailures} sin histórico` : ""}</p>
    <DataNotes notes={data.dataNotes}/>{selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)}/> : null}
  </div>;
}

function AlertCard({ alert, mine, cash, busy, onSelect, onBuyout }: { alert: ClauseAlert; mine: boolean; cash: number | null; busy: boolean; onSelect: (player: Player) => void; onBuyout: (alert: ClauseAlert) => void }) {
  const cannotAfford = cash !== null && cash < alert.official.buyoutClause;
  const disabled = mine || alert.official.isShielded || cannotAfford || busy;
  return <article className="rounded-[26px] glass p-4">
    <button type="button" onClick={() => onSelect(alert.player)} className="flex w-full items-center gap-3 text-left"><PlayerImage player={alert.player} size={52}/><div className="min-w-0 flex-1"><p className="truncate font-bold text-white">{alert.player.name}</p><p className="truncate text-xs text-neutral-500">{alert.player.position} · {alert.player.team} · {alert.owner.managerName}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${LEVEL_STYLE[alert.level]}`}>{alert.level === "INFORMATIVA" ? "INFO" : alert.level}</span></button>
    <div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Valor" value={millions(alert.official.marketValue)}/><Metric label="Cláusula" value={millions(alert.official.buyoutClause)} accent/></div>
    <div className="mt-2 grid grid-cols-3 gap-2"><CompactMetric icon={<ArrowUpRight size={13}/>} label="Subida/día" value={signedMillions(alert.calculated.dailyTrend)}/><CompactMetric label="Cubierta" value={percent(alert.calculated.valueToClauseRatio)}/><CompactMetric icon={<Clock3 size={13}/>} label="Estimación" value={alert.calculated.estimatedDays !== null ? days(alert.calculated.estimatedDays) : UNKNOWN}/></div>
    {/*
      Cuando no hay tendencia ni estimacion, la tarjeta dice POR QUE. Dejar dos
      guiones sueltos deja al lector adivinando si es que el jugador no sube o
      es que a la app le faltan datos, y son cosas muy distintas.
    */}
    {motivoSinTendencia(alert) && <p className="mt-2 rounded-xl bg-white/[.03] px-3 py-2 text-[11px] leading-4 text-neutral-500">{motivoSinTendencia(alert)}</p>}
    <div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className={`flex items-center gap-1 ${alert.official.isShielded ? "text-rose-400" : "text-emerald-400"}`}>{alert.official.isShielded ? <ShieldCheck size={14}/> : <ShieldOff size={14}/>} {alert.official.isShielded ? blindaje(alert) : "Desbloqueada"}</span><span className="text-neutral-500">Faltan {millions(Math.max(0, alert.calculated.gap))}</span></div>
    {!mine && <button type="button" disabled={disabled} onClick={() => onBuyout(alert)} className="mt-3 min-h-11 w-full rounded-2xl bg-[#7c3aed] px-4 text-sm font-bold text-white disabled:bg-white/5 disabled:text-neutral-600">{busy ? "Confirmando…" : alert.official.isShielded ? "Cláusula bloqueada" : cannotAfford ? "Caja insuficiente" : `Pagar ${millions(alert.official.buyoutClause)}`}</button>}
  </article>;
}
/**
 * Cuanto le queda al blindaje.
 *
 * Si LALIGA publica la fecha, se dice el plazo Y la fecha. Si no la publica, se
 * dice eso mismo: no se calcula un plazo tipico ni se asume la duracion de
 * ningun blindaje anterior.
 */
function blindaje(alert: ClauseAlert): string {
  const { daysUntilUnshielded: dias, shieldedUntil } = alert.official;
  if (dias === null || shieldedUntil === null) return "Bloqueada · LALIGA no publica hasta cuándo";
  if (dias < 1) return `Bloqueada · se abre hoy (${shortDate(shieldedUntil)})`;
  return `Bloqueada · ${days(dias)} (${shortDate(shieldedUntil)})`;
}

/**
 * Por que esta alerta no trae subida diaria ni estimacion de dias.
 *
 * Valor y clausula siguen siendo oficiales y de hoy; lo que falta es la parte
 * calculada. `null` cuando si hay tendencia y no hay nada que explicar.
 */
function motivoSinTendencia(alert: ClauseAlert): string | null {
  const { missingReason, historyAgeDays } = alert.calculated;
  if (!missingReason) return null;
  if (missingReason === "sin_historico") return "Sin tendencia: LALIGA no publica histórico de cotización de este jugador.";
  if (missingReason === "historico_desactualizado") {
    const antiguedad = historyAgeDays === null ? "" : ` (último dato hace ${Math.round(historyAgeDays)} días)`;
    return `Sin tendencia: la cotización publicada está congelada${antiguedad}. Valor y cláusula sí son de hoy.`;
  }
  return "Sin estimación: el valor no está subiendo, así que no hay ritmo del que deducir días.";
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="glass-soft rounded-2xl p-3"><p className="text-[10px] text-white/45">{label}</p><p className="mt-1 text-xl font-bold text-[#a78bfa]">{value}</p></div>; }
function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`rounded-2xl p-3 ${accent ? "bg-[#7c3aed]/20 ring-1 ring-[#7c3aed]/40" : "glass-soft"}`}><p className="text-[10px] text-neutral-500">{label}</p><p className="mt-1 font-bold text-white">{value}</p></div>; }
function CompactMetric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) { return <div className="glass-soft min-w-0 rounded-2xl px-2 py-2 text-center"><p className="flex items-center justify-center gap-1 truncate text-[9px] text-neutral-500">{icon}{label}</p><p className="mt-1 truncate text-[11px] font-bold text-neutral-200">{value}</p></div>; }
