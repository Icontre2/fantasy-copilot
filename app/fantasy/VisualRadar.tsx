"use client";

import { Children, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ShieldAlert, ShoppingBag } from "lucide-react";
import { getCacheado } from "./api";
import { PlayerImage } from "./PlayerImage";
import { millions } from "./format";
import type { AlertsResponse, MarketResponse, ClauseAlert } from "./types";

/**
 * Bloque visual de Inicio. Convierte los datos reales que ya usa la app en una
 * lectura rápida de mercado: subidas, riesgo de cláusula y oportunidades del
 * mercado. No inventa variaciones: una subida solo aparece si LALIGA publica
 * histórico suficiente y actualizado para calcularla.
 */
export function VisualRadar({ leagueId }: { leagueId: string }) {
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCacheado<AlertsResponse>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/alerts`),
      getCacheado<MarketResponse>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/market`),
    ])
      .then(([alertsResponse, marketResponse]) => {
        if (cancelled) return;
        setAlerts(alertsResponse);
        setMarket(marketResponse);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [leagueId]);

  const risers = useMemo(() => {
    if (!alerts) return [];
    return alerts.alerts
      .filter((alert) => alert.calculated.dailyTrendRatio !== null && alert.calculated.dailyTrendRatio > 0)
      .sort((a, b) => (b.calculated.dailyTrendRatio ?? 0) - (a.calculated.dailyTrendRatio ?? 0))
      .slice(0, 3);
  }, [alerts]);

  const clauseRisk = useMemo(() => {
    if (!alerts) return [];
    return alerts.alerts
      .filter((alert) => alert.level === "CRITICA" || alert.level === "ALTA")
      .sort((a, b) => b.calculated.valueToClauseRatio - a.calculated.valueToClauseRatio)
      .slice(0, 3);
  }, [alerts]);

  const marketLeaders = useMemo(() => {
    if (!market) return [];
    return [...market.market]
      .sort((a, b) => (b.numberOfBids ?? -1) - (a.numberOfBids ?? -1))
      .slice(0, 3);
  }, [market]);

  if (error) return null;
  if (!alerts && !market) return <RadarSkeleton />;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#a78bfa]">Radar de mercado</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-.035em] text-white">Lo que está pasando</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[.045] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/45">En vivo</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <RadarCard eyebrow="SUBEN" title="Los que más están creciendo" icon={<ArrowUpRight size={18} />} tone="up" empty="No hay suficiente histórico actualizado para medir subidas.">
          {risers.map((alert, index) => <RiserRow key={alert.player.id} alert={alert} rank={index + 1} />)}
        </RadarCard>

        <RadarCard eyebrow="CLÁUSULAS" title="Ojo con estos jugadores" icon={<ShieldAlert size={18} />} tone="danger" empty="No hay alertas altas o críticas ahora mismo.">
          {clauseRisk.map((alert, index) => <ClauseRow key={alert.player.id} alert={alert} rank={index + 1} />)}
        </RadarCard>
      </div>

      {marketLeaders.length > 0 && (
        <RadarCard eyebrow="MERCADO" title="Lo que más se está moviendo" icon={<ShoppingBag size={18} />} tone="neutral" empty="Sin jugadores en mercado.">
          <div className="grid gap-2 sm:grid-cols-3">
            {marketLeaders.map((entry, index) => (
              <div key={entry.marketId} className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[.025] p-3">
                <span className="absolute right-3 top-2 text-[10px] font-black text-white/25">0{index + 1}</span>
                <div className="flex items-center gap-2">
                  <PlayerImage player={entry.player} size={42} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{entry.player.name}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">{entry.player.team}</p>
                  </div>
                </div>
                <p className="mt-3 text-lg font-black text-white">{millions(entry.salePrice)}</p>
                <p className="text-[10px] text-white/35">{entry.numberOfBids === undefined ? "Pujas no publicadas" : `${entry.numberOfBids} ${entry.numberOfBids === 1 ? "puja" : "pujas"}`}</p>
              </div>
            ))}
          </div>
        </RadarCard>
      )}
    </section>
  );
}

function RiserRow({ alert, rank }: { alert: ClauseAlert; rank: number }) {
  const ratio = alert.calculated.dailyTrendRatio;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[.035] p-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-xs font-black text-emerald-300">{rank}</span>
      <PlayerImage player={alert.player} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-white">{alert.player.name}</p>
        <p className="text-[11px] text-white/40">{alert.player.team} · {millions(alert.player.marketValue)}</p>
      </div>
      <div className="text-right">
        <p className="flex items-center justify-end gap-1 text-base font-black text-emerald-300"><ArrowUpRight size={15} /> +{((ratio ?? 0) * 100).toFixed(2)}%</p>
        <p className="text-[10px] text-white/35">por día</p>
      </div>
    </div>
  );
}

function ClauseRow({ alert, rank }: { alert: ClauseAlert; rank: number }) {
  const percent = Math.min(999, alert.calculated.valueToClauseRatio * 100);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-rose-400/10 bg-rose-400/[.035] p-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-400/10 text-xs font-black text-rose-300">{rank}</span>
      <PlayerImage player={alert.player} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-white">{alert.player.name}</p>
        <p className="text-[11px] text-white/40">{alert.owner.managerName} · cláusula {millions(alert.official.buyoutClause)}</p>
      </div>
      <div className="text-right">
        <p className="text-base font-black text-rose-300">{percent.toFixed(0)}%</p>
        <p className="text-[10px] text-white/35">de la cláusula</p>
      </div>
    </div>
  );
}

function RadarCard({ eyebrow, title, icon, tone, empty, children }: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  tone: "up" | "danger" | "neutral";
  empty: string;
  children: React.ReactNode;
}) {
  const toneClass = tone === "up" ? "text-emerald-300" : tone === "danger" ? "text-rose-300" : "text-[#c4b5fd]";
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/9 bg-[#0c0c10] p-4 shadow-[0_20px_60px_rgba(0,0,0,.22)]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-white/[.025] blur-3xl" />
      <div className="relative mb-3 flex items-start gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-xl bg-white/[.045] ${toneClass}`}>{icon}</span>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[.18em] ${toneClass}`}>{eyebrow}</p>
          <h3 className="mt-0.5 text-base font-black tracking-tight text-white">{title}</h3>
        </div>
      </div>
      <div className="relative space-y-2">
        {children}
        {Children.count(children) === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-white/35">{empty}</p>}
      </div>
    </article>
  );
}

function RadarSkeleton() {
  return (
    <section className="space-y-3" aria-label="Cargando radar">
      <div className="h-8 w-48 animate-pulse rounded-xl bg-white/[.06]" />
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1].map((item) => <div key={item} className="h-48 animate-pulse rounded-[28px] border border-white/8 bg-white/[.025]" />)}
      </div>
    </section>
  );
}
