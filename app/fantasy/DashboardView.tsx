"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Banknote, ChevronRight, Coins, ShieldAlert, ShoppingBag, Trophy, Users } from "lucide-react";
import Image from "next/image";
import type { DashboardResponse, MarketValuePoint, Player } from "./types";
import { getCacheado } from "./api";
import { millions, signedMillions } from "./format";
import { ManagerSheet } from "./ManagerSheet";
import { TrendChart } from "./TrendChart";
import { dayMonth, trendColor } from "./trend";
import { aggregateCurrentSquad, filterPlayerHistory, historyDelta, RANGES, type HistoryRange } from "./squad-history";
import { ErrorBox } from "./ui";
import { PlayerImage } from "./PlayerImage";
import type { LineupsResponse } from "./LineupsView";

type ValueHistoryResponse = { teamId: string; from: string; histories: Record<string, MarketValuePoint[]>; failedPlayerIds: string[] };
type IntelligenceAlert = {
  level: "CRITICA" | "ALTA" | "MEDIA" | "INFORMATIVA";
  player: Player;
  owner: { managerId: string; managerName: string; teamId: string };
  official: { marketValue: number; buyoutClause: number; isShielded: boolean; daysUntilUnshielded: number | null };
  calculated: { dailyTrend: number; valueToClauseRatio: number; estimatedDays: number | null; gap: number; missingReason?: string | null };
};
type IntelligenceResponse = { alerts: IntelligenceAlert[] };
type MarketResponseLite = { market: Array<{ marketId: string; player: Player; salePrice: number; expiresAt?: string; sellerKind: string }> };

function rivalesDe(data: DashboardResponse) { return Array.isArray(data.competitors) ? data.competitors : []; }

export function DashboardView({ data }: { data: DashboardResponse }) {
  const [range, setRange] = useState<HistoryRange>("AUG1");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceAlert[]>([]);
  const [market, setMarket] = useState<MarketResponseLite["market"]>([]);
  const competitors = rivalesDe(data);
  const sinEquipo = !data?.me?.teamId;
  const { histories, cargando, error } = useSquadHistory(data.league?.id, data.me?.teamId);

  useEffect(() => {
    if (!data?.league?.id) return;
    let cancelled = false;
    Promise.all([
      getCacheado<IntelligenceResponse>(`/api/fantasy/leagues/${encodeURIComponent(data.league.id)}/alerts`),
      getCacheado<MarketResponseLite>(`/api/fantasy/leagues/${encodeURIComponent(data.league.id)}/market`),
    ]).then(([alerts, marketData]) => {
      if (cancelled) return;
      setIntelligence(Array.isArray(alerts.alerts) ? alerts.alerts : []);
      setMarket(Array.isArray(marketData.market) ? marketData.market : []);
    }).catch(() => { if (!cancelled) { setIntelligence([]); setMarket([]); } });
    return () => { cancelled = true; };
  }, [data?.league?.id]);

  const total = useMemo(() => {
    const recortado = Object.fromEntries(Object.entries(histories).map(([playerId, points]) => [playerId, filterPlayerHistory(points, range)]));
    return aggregateCurrentSquad(recortado);
  }, [histories, range]);
  const delta = historyDelta(total);
  const rising = useMemo(() => intelligence.filter((a) => a.calculated.dailyTrend > 0).sort((a, b) => b.calculated.dailyTrend - a.calculated.dailyTrend).slice(0, 3), [intelligence]);
  const falling = useMemo(() => intelligence.filter((a) => a.calculated.dailyTrend < 0).sort((a, b) => a.calculated.dailyTrend - b.calculated.dailyTrend).slice(0, 3), [intelligence]);
  const clause = useMemo(() => intelligence.filter((a) => !a.official.isShielded).sort((a, b) => (a.calculated.estimatedDays ?? 99999) - (b.calculated.estimatedDays ?? 99999)).slice(0, 3), [intelligence]);
  const closing = useMemo(() => market.filter((entry) => entry.expiresAt).sort((a, b) => Date.parse(a.expiresAt!) - Date.parse(b.expiresAt!)).slice(0, 3), [market]);

  if (sinEquipo) return <ErrorBox message="LALIGA no ha devuelto tu equipo en esta liga. Vuelve a entrar en unos minutos." />;
  const competidorAbierto = competitors.find((competitor) => competitor.teamId === abierto);

  return <div className="space-y-4">
    <section className="glass-strong overflow-hidden rounded-[30px] p-5 text-white">
      <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#a78bfa]">Centro de inteligencia</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Lo importante de tu fantasy</h1><p className="mt-2 text-sm leading-5 text-white/55">Subidas, bajadas, cláusulas y liga. Todo lo que merece tu atención ahora.</p></div><div className="rounded-2xl bg-[#7c3aed]/20 px-3 py-2 text-center ring-1 ring-[#7c3aed]/35"><Trophy size={17} className="mx-auto text-[#c4b5fd]"/><p className="mt-1 text-lg font-black">#{data.me.position ?? "—"}</p><p className="text-[10px] text-white/50">posición</p></div></div>
      <div className="mt-5 grid grid-cols-2 gap-2"><Metric icon={<Coins size={16}/>} label="Caja" value={millions(data.me.teamMoney)} accent/><Metric icon={<Banknote size={16}/>} label="Valor" value={millions(data.me.teamValue)}/></div>
    </section>

    <section className="rounded-[28px] glass p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Mercado · ahora</p><h2 className="text-xl font-bold text-white">Qué está pasando</h2></div><span className="rounded-full bg-white/[.05] px-3 py-1 text-[11px] font-semibold text-neutral-400">{intelligence.length} señales</span></div><div className="grid gap-2 sm:grid-cols-3"><Signal label="Suben" value={rising.length ? `+${rising.length}` : "—"} tone="up" icon={<ArrowUpRight size={17}/>} /><Signal label="Bajan" value={falling.length ? `${falling.length}` : "—"} tone="down" icon={<ArrowDownRight size={17}/>} /><Signal label="Cláusulas" value={clause.length ? `${clause.length}` : "—"} tone="warn" icon={<ShieldAlert size={17}/>} /></div></section>

    <IntelligenceSection title="Están subiendo" eyebrow="Oportunidades de valor" icon={<ArrowUpRight size={18}/>} tone="up" items={rising} empty="No hay subidas con tendencia disponible ahora." />
    <IntelligenceSection title="Están bajando" eyebrow="Riesgo de pérdida de valor" icon={<ArrowDownRight size={18}/>} tone="down" items={falling} empty="No hay bajadas con tendencia disponible ahora." />

    <section className="rounded-[28px] border border-orange-500/20 bg-orange-500/[.06] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-orange-300/70">Alerta prioritaria</p><h2 className="mt-1 text-xl font-bold text-white">Se acercan a cláusula</h2><p className="mt-1 text-xs leading-4 text-white/50">Primero los desbloqueados y con menos días estimados.</p></div><ShieldAlert className="shrink-0 text-orange-300" size={22}/></div><div className="mt-3 space-y-2">{clause.length ? clause.map((item) => <ClauseRow key={`${item.owner.teamId}-${item.player.id}`} item={item}/>) : <p className="rounded-2xl bg-white/[.04] p-3 text-sm text-neutral-500">No hay una cláusula urgente que vigilar.</p>}</div></section>

    {closing.length > 0 && <section className="rounded-[28px] glass p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Mercado</p><h2 className="text-xl font-bold text-white">Cierres próximos</h2></div><ShoppingBag size={19} className="text-[#a78bfa]"/></div><div className="mt-3 space-y-2">{closing.map((entry) => <MarketRow key={entry.marketId} entry={entry}/>)}</div></section>}

    <section className="rounded-[28px] glass p-4"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Tu liga</p><h2 className="text-xl font-bold text-white">La clasificación</h2></div><span className="flex items-center gap-1 text-xs text-neutral-500"><Users size={14}/>{competitors.length + 1} managers</span></div><div className="space-y-2"><LeagueRow mine data={data.me}/>{competitors.slice(0, 4).map((competitor) => <LeagueRow key={competitor.teamId} data={competitor} onClick={() => setAbierto(competitor.teamId)}/>)}</div><p className="mt-3 text-[10px] leading-4 text-neutral-600">Los datos de caja ajena solo se muestran como oficiales cuando LALIGA los publica; las estimaciones permanecen marcadas.</p></section>

    <section className="glass rounded-[28px] p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Evolución</p><h2 className="text-xl font-bold text-white">Valor de tu plantilla</h2></div><span className={delta === null ? "text-xs text-neutral-500" : delta >= 0 ? "text-xs font-bold text-emerald-400" : "text-xs font-bold text-rose-400"}>{delta === null ? "Sin datos" : `${delta >= 0 ? "+" : ""}${millions(delta)}`}</span></div><RangePicker value={range} onChange={setRange}/><ValueChart points={total} cargando={cargando} error={error} delta={delta}/></section>

    {competidorAbierto && <ManagerSheet key={competidorAbierto.teamId} competitor={competidorAbierto} leagueId={data.league.id} onClose={() => setAbierto(null)}/>} 
  </div>;
}

function IntelligenceSection({ title, eyebrow, icon, tone, items, empty }: { title: string; eyebrow: string; icon: React.ReactNode; tone: "up" | "down"; items: IntelligenceAlert[]; empty: string }) { return <section className="rounded-[28px] glass p-4"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-2xl ${tone === "up" ? "bg-emerald-500/12 text-emerald-400" : "bg-rose-500/12 text-rose-400"}`}>{icon}</span><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">{eyebrow}</p><h2 className="text-xl font-bold text-white">{title}</h2></div></div><div className="mt-3 space-y-2">{items.length ? items.map((item) => <TrendRow key={`${item.owner.teamId}-${item.player.id}`} item={item} tone={tone}/>) : <p className="rounded-2xl bg-white/[.03] p-3 text-sm text-neutral-500">{empty}</p>}</div></section>; }
function TrendRow({ item, tone }: { item: IntelligenceAlert; tone: "up" | "down" }) { return <article className="flex items-center gap-3 rounded-2xl bg-white/[.035] p-3"><PlayerImage player={item.player} size={44}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{item.player.name}</p><p className="truncate text-[11px] text-neutral-500">{item.player.position} · {item.player.team} · {item.owner.managerName}</p></div><div className="text-right"><p className={`text-sm font-black ${tone === "up" ? "text-emerald-400" : "text-rose-400"}`}>{signedMillions(item.calculated.dailyTrend)}</p><p className="text-[9px] text-neutral-600">por día</p></div></article>; }
function ClauseRow({ item }: { item: IntelligenceAlert }) { return <article className="flex items-center gap-3 rounded-2xl bg-white/[.05] p-3"><PlayerImage player={item.player} size={44}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{item.player.name}</p><p className="truncate text-[11px] text-white/45">{item.player.team} · {item.owner.managerName}</p></div><div className="text-right"><p className="text-sm font-black text-orange-300">{item.calculated.estimatedDays === null ? "—" : `${Math.max(0, Math.round(item.calculated.estimatedDays))} días`}</p><p className="text-[9px] text-white/35">faltan {millions(Math.max(0, item.calculated.gap))}</p></div></article>; }
function MarketRow({ entry }: { entry: MarketResponseLite["market"][number] }) { const hours = entry.expiresAt ? Math.max(0, (Date.parse(entry.expiresAt) - Date.now()) / 3_600_000) : null; return <article className="flex items-center gap-3 rounded-2xl bg-white/[.035] p-3"><PlayerImage player={entry.player} size={42}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{entry.player.name}</p><p className="text-[11px] text-neutral-500">{entry.player.team} · {millions(entry.salePrice)}</p></div><div className="text-right"><p className="text-sm font-bold text-white">{hours === null ? "—" : hours < 1 ? "< 1 h" : `${Math.round(hours)} h`}</p><p className="text-[9px] text-neutral-600">para cierre</p></div></article>; }
function LeagueRow({ data, mine = false, onClick }: { data: DashboardResponse["me"] | DashboardResponse["competitors"][number]; mine?: boolean; onClick?: () => void }) { const content = <div className={`flex items-center gap-3 rounded-2xl p-3 ${mine ? "bg-[#7c3aed]/12 ring-1 ring-[#7c3aed]/30" : "bg-white/[.035]"}`}><Avatar name={data.manager.name} image={data.manager.avatar}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{data.manager.name}{mine ? " · Tú" : ""}</p><p className="text-[11px] text-neutral-500">#{data.position ?? "—"} · {data.points ?? "—"} pts</p></div><div className="text-right"><p className="text-sm font-bold text-white">{millions(data.teamValue)}</p><p className="text-[9px] text-neutral-600">valor</p></div>{onClick && <ChevronRight size={15} className="text-neutral-600"/>}</div>; return onClick ? <button type="button" className="w-full text-left" onClick={onClick}>{content}</button> : content; }
function RangePicker({ value, onChange }: { value: HistoryRange; onChange: (value: HistoryRange) => void }) { return <div className="mt-4 grid grid-cols-5 gap-1 rounded-2xl bg-white/[.06] p-1" aria-label="Periodo del histórico">{RANGES.map((option) => <button key={String(option.value)} type="button" onClick={() => onChange(option.value)} className={`min-h-10 rounded-xl text-xs font-bold ${value === option.value ? "bg-[#7c3aed] text-white" : "text-white/50"}`}>{option.label}</button>)}</div>; }
function ValueChart({ points, cargando, error, delta }: { points: MarketValuePoint[]; cargando: boolean; error: string | null; delta: number | null }) { if (points.length < 2) return <div className="mt-3 grid h-28 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[.03] px-6 text-center text-xs leading-5 text-white/40">{error ?? (cargando ? "Cargando cotización oficial…" : "No hay suficientes días de valor en este periodo.")}</div>; return <TrendChart className="mt-3" points={points.map((point) => ({ date: point.date, value: point.marketValue }))} formatValue={millions} formatDate={dayMonth} color={trendColor(delta)} label={`Valor de tu plantilla desde ${dayMonth(points[0]!.date)}, ${points.length} días`}/>; }
function Metric({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) { return <div className={`rounded-2xl p-3 ${accent ? "bg-[#7c3aed]/20 ring-1 ring-[#7c3aed]/35" : "glass-soft"}`}><div className="flex items-center gap-2 text-xs text-white/55">{icon}{label}</div><p className="mt-1 text-lg font-bold text-white">{value}</p></div>; }
function Signal({ label, value, tone, icon }: { label: string; value: string; tone: "up" | "down" | "warn"; icon: React.ReactNode }) { const cls = tone === "up" ? "text-emerald-400 bg-emerald-500/10" : tone === "down" ? "text-rose-400 bg-rose-500/10" : "text-orange-300 bg-orange-500/10"; return <div className={`rounded-2xl p-3 ${cls}`}><div className="flex items-center gap-2 text-xs font-semibold opacity-80">{icon}{label}</div><p className="mt-1 text-xl font-black">{value}</p></div>; }
function Avatar({ name, image }: { name: string; image?: string }) { if (image) return <Image src={image} alt="" width={40} height={40} unoptimized className="h-10 w-10 shrink-0 rounded-full bg-neutral-100 object-cover"/>; return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#7c3aed]/20 text-sm font-bold text-[#c4b5fd]">{name.slice(0, 1).toUpperCase()}</span>; }
function useSquadHistory(leagueId: string | undefined, teamId: string | undefined) { const [histories, setHistories] = useState<Record<string, MarketValuePoint[]>>({}); const [cargando, setCargando] = useState(true); const [error, setError] = useState<string | null>(null); useEffect(() => { if (!leagueId || !teamId) return; let cancelado = false; getCacheado<ValueHistoryResponse>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/teams/${encodeURIComponent(teamId)}/value-history`).then((respuesta) => { if (!cancelado) { setHistories(respuesta.histories ?? {}); setError(null); } }).catch((caught: unknown) => { if (!cancelado) setError(caught instanceof Error ? caught.message : "No se pudo cargar la evolución."); }).finally(() => { if (!cancelado) setCargando(false); }); return () => { cancelado = true; }; }, [leagueId, teamId]); return { histories, cargando, error }; }
