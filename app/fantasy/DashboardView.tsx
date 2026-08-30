"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Coins, Shield, Trophy, Users, ChevronRight } from "lucide-react";
import Image from "next/image";
import type { DashboardResponse, MarketValuePoint, ManagerEconomy } from "./types";
import { getCacheado } from "./api";
import { millions } from "./format";
import { ManagerSheet } from "./ManagerSheet";
import { TrendChart } from "./TrendChart";
import { dayMonth, trendColor } from "./trend";
import { aggregateCurrentSquad, filterPlayerHistory, historyDelta, RANGES, type HistoryRange } from "./squad-history";
import { ErrorBox } from "./ui";
import { PlayerImage } from "./PlayerImage";

type ValueHistoryResponse = { teamId: string; from: string; histories: Record<string, MarketValuePoint[]>; failedPlayerIds: string[] };
type EconomyResponse = { leagueId: string; saldoInicial: number; actividadDesde: string | null; actividadHasta: string | null; operaciones: number; economies: ManagerEconomy[]; dataNotes: string[] };

export function DashboardView({ data }: { data: DashboardResponse }) {
  const [range, setRange] = useState<HistoryRange>("AUG1");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [economies, setEconomies] = useState<ManagerEconomy[]>([]);
  const competitors = Array.isArray(data.competitors) ? data.competitors : [];
  const { histories, cargando, error } = useSquadHistory(data.league?.id, data.me?.teamId);

  useEffect(() => {
    if (!data.league?.id) return;
    let cancelled = false;
    getCacheado<EconomyResponse>(`/api/fantasy/leagues/${encodeURIComponent(data.league.id)}/economy`)
      .then((response) => { if (!cancelled) setEconomies(Array.isArray(response.economies) ? response.economies : []); })
      .catch(() => { if (!cancelled) setEconomies([]); });
    return () => { cancelled = true; };
  }, [data.league?.id]);

  const total = useMemo(() => {
    const recortado = Object.fromEntries(Object.entries(histories).map(([id, points]) => [id, filterPlayerHistory(points, range)]));
    return aggregateCurrentSquad(recortado);
  }, [histories, range]);
  const delta = historyDelta(total);
  if (!data?.me?.teamId) return <ErrorBox message="LALIGA no ha devuelto tu equipo en esta liga. Vuelve a entrar en unos minutos." />;
  const rivalAbierto = competitors.find((rival) => rival.teamId === abierto);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#101a39_0%,#172754_58%,#1f3767_100%)] p-5 text-white shadow-[0_24px_70px_rgba(12,22,52,.24)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">Valor de tu plantilla</p>
            <p className="mt-2 text-[36px] font-bold leading-none tracking-[-.04em]">{millions(data.me.teamValue)}</p>
            <p className={`mt-2 flex items-center gap-1 text-sm ${delta === null || delta >= 0 ? "text-[#d6ff75]" : "text-rose-300"}`}>
              <ArrowUpRight size={15} /> {delta === null ? "Sin histórico suficiente" : `${delta >= 0 ? "+" : ""}${millions(delta)} en el periodo`}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-center backdrop-blur">
            <Trophy size={17} className="mx-auto text-[#d6ff75]" />
            <p className="mt-1 text-lg font-bold">#{data.me.position ?? "—"}</p>
            <p className="text-[10px] text-white/55">posición</p>
          </div>
        </div>

        <RangePicker value={range} onChange={setRange} />
        <ValueChart points={total} cargando={cargando} error={error} delta={delta} />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric icon={<Shield size={16} />} label="Plantilla" value={millions(data.me.teamValue)} />
          <Metric icon={<Coins size={16} />} label="Caja disponible" value={millions(data.me.teamMoney)} accent />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-400">Tu liga</p><h2 className="text-xl font-bold tracking-tight text-white">Competidores</h2></div>
          <span className="flex items-center gap-1 rounded-full bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-neutral-300"><Users size={14} /> {competitors.length + 1}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {competitors.map((competitor) => {
            const economy = economies.find((item) => item.managerId === competitor.manager.id);
            const cash = competitor.teamMoney ?? economy?.cajaOficial;
            const reconstructed = economy?.cajaReconstruida ?? competitor.estimatedCash;
            return (
              <article key={competitor.teamId} className="overflow-hidden rounded-[26px] border border-white/[.08] bg-white/[.045]">
                <button type="button" onClick={() => setAbierto(competitor.teamId)} className="w-full p-4 text-left transition active:scale-[.99]" aria-label={`Ver la ficha de ${competitor.manager.name}`}>
                  <div className="flex items-center gap-3">
                    <Avatar name={competitor.manager.name} image={competitor.manager.avatar} />
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{competitor.manager.name}</p><p className="text-xs text-neutral-400">#{competitor.position ?? "—"} · {competitor.points ?? "—"} pts</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-white">{millions(competitor.teamValue)}</p><p className="text-[9px] text-neutral-600">valor</p></div><ChevronRight size={16} className="text-neutral-500" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <SmallMetric label={cash !== undefined ? "Caja" : "Caja aprox."} value={cash !== undefined ? millions(cash) : `≈ ${millions(reconstructed)}`} />
                    <SmallMetric label="Cláusulas" value={economy ? millions(economy.gastoClausulasEstimado) : "—"} warning={Boolean(economy?.gastoClausulasEstimado)} />
                    <SmallMetric label="Poder compra" value={economy ? millions(economy.cajaReconstruida) : `≈ ${millions(reconstructed)}`} />
                  </div>
                </button>
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-4 text-neutral-500">La caja reconstruida parte de 100 M€ y suma/resta operaciones y puntos. El gasto en subir cláusulas es una <strong>estimación</strong>: LALIGA no identifica cada subida manual en el historial.</p>
      </section>

      {rivalAbierto && <ManagerSheet key={rivalAbierto.teamId} competitor={rivalAbierto} leagueId={data.league.id} onClose={() => setAbierto(null)} />}
    </div>
  );
}

function useSquadHistory(leagueId: string | undefined, teamId: string | undefined) {
  const [histories, setHistories] = useState<Record<string, MarketValuePoint[]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!leagueId || !teamId) return;
    let cancelled = false;
    getCacheado<ValueHistoryResponse>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/teams/${encodeURIComponent(teamId)}/value-history`)
      .then((response) => { if (!cancelled) { setHistories(response.histories ?? {}); setError(null); } })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "No se pudo cargar la evolución."); })
      .finally(() => { if (!cancelled) setCargando(false); });
    return () => { cancelled = true; };
  }, [leagueId, teamId]);
  return { histories, cargando, error };
}

function RangePicker({ value, onChange }: { value: HistoryRange; onChange: (value: HistoryRange) => void }) {
  return <div className="mt-5 grid grid-cols-5 gap-1 rounded-2xl bg-white/[.06] p-1" aria-label="Periodo del histórico">{RANGES.map((option) => <button key={String(option.value)} type="button" onClick={() => onChange(option.value)} className={`min-h-11 rounded-xl text-xs font-bold ${value === option.value ? "bg-[#d6ff75] text-[#101a39]" : "text-white/55"}`} aria-pressed={value === option.value}>{option.label}</button>)}</div>;
}

function ValueChart({ points, cargando, error, delta }: { points: MarketValuePoint[]; cargando: boolean; error: string | null; delta: number | null }) {
  if (points.length < 2) return <div className="mt-3 grid h-28 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 text-center text-xs text-white/45">{error ?? (cargando ? "Cargando histórico oficial…" : "No hay dos días con valor en este periodo.")}</div>;
  return <TrendChart className="mt-3" points={points.map((p) => ({ date: p.date, value: p.marketValue }))} formatValue={millions} formatDate={dayMonth} color={trendColor(delta)} label="Evolución del valor de tu plantilla" />;
}

function Metric({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl p-3 ${accent ? "bg-[#d6ff75] text-[#101a39]" : "bg-white/10"}`}><div className="flex items-center gap-2 text-xs opacity-70">{icon}{label}</div><p className="mt-1 text-lg font-bold tracking-tight">{value}</p></div>;
}

function SmallMetric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className={`rounded-2xl px-3 py-2 ${warning ? "bg-orange-500/10 ring-1 ring-orange-500/20" : "bg-white/[.05]"}`}><p className="text-[10px] text-neutral-500">{label}</p><p className={`mt-0.5 font-bold ${warning ? "text-orange-300" : "text-white"}`}>{value}</p></div>;
}

function Avatar({ name, image }: { name: string; image?: string }) {
  if (image) return <Image src={image} alt="" width={40} height={40} unoptimized className="h-10 w-10 shrink-0 rounded-full bg-neutral-100 object-cover" />;
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#101a39] text-sm font-bold text-[#d6ff75]">{name.slice(0, 1).toUpperCase()}</span>;
}
