"use client";

import { ArrowUpRight, Coins, Shield, Trophy, Users } from "lucide-react";
import Image from "next/image";
import type { DashboardResponse } from "./types";
import { millions } from "./format";

export function DashboardView({ data }: { data: DashboardResponse }) {
  const delta = data.history.length > 1
    ? (data.history.at(-1)?.value ?? 0) - (data.history[0]?.value ?? 0)
    : null;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#101a39_0%,#172754_58%,#1f3767_100%)] p-5 text-white shadow-[0_24px_70px_rgba(12,22,52,.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">Tu patrimonio fantasy</p>
            <p className="mt-2 text-[34px] font-bold leading-none tracking-[-.04em]">{millions(data.me.netWorth)}</p>
            <p className="mt-2 flex items-center gap-1 text-sm text-[#d6ff75]">
              <ArrowUpRight size={15} /> {delta === null ? "Creando histórico" : `${delta >= 0 ? "+" : ""}${millions(delta)} en 30 días`}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-center backdrop-blur">
            <Trophy size={17} className="mx-auto text-[#d6ff75]" />
            <p className="mt-1 text-lg font-bold">#{data.me.position ?? "—"}</p>
            <p className="text-[10px] text-white/55">posición</p>
          </div>
        </div>

        <ValueChart points={data.history} />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric icon={<Shield size={16} />} label="Plantilla" value={millions(data.me.teamValue)} />
          <Metric icon={<Coins size={16} />} label="Caja disponible" value={millions(data.me.teamMoney)} accent />
        </div>
        <p className="mt-3 text-[10px] leading-4 text-white/45">
          Evolución de la plantilla actual · {data.historyCoverage.covered}/{data.historyCoverage.total} jugadores con histórico.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-400">Tu liga</p>
            <h2 className="text-xl font-bold tracking-tight text-[#101a39]">Competidores</h2>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 shadow-sm">
            <Users size={14} /> {data.competitors.length + 1}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.competitors.map((competitor) => (
            <article key={competitor.teamId} className="rounded-3xl border border-white bg-white/90 p-4 shadow-[0_10px_35px_rgba(16,26,57,.07)]">
              <div className="flex items-center gap-3">
                <Avatar name={competitor.manager.name} image={competitor.manager.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#101a39]">{competitor.manager.name}</p>
                  <p className="text-xs text-neutral-400">#{competitor.position ?? "—"} · {competitor.points ?? "—"} pts</p>
                </div>
                <p className="text-sm font-bold text-[#101a39]">{millions(competitor.netWorth)}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <SmallMetric label="Equipo" value={millions(competitor.teamValue)} />
                <SmallMetric label="Caja" value={millions(competitor.teamMoney)} lime />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ValueChart({ points }: { points: { date: string; value: number }[] }) {
  if (points.length < 2) return <div className="mt-6 grid h-28 place-items-center rounded-2xl bg-white/5 text-xs text-white/45">El histórico aparecerá aquí.</div>;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * 100;
    const y = 92 - ((point.value - min) / range) * 72;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,100 ${coords} 100,100`;
  return (
    <div className="mt-5 h-32">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label="Histórico del valor de plantilla">
        <defs><linearGradient id="valueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6ff75" stopOpacity=".35"/><stop offset="1" stopColor="#d6ff75" stopOpacity="0"/></linearGradient></defs>
        <polygon points={area} fill="url(#valueArea)" />
        <polyline points={coords} fill="none" stroke="#d6ff75" strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Metric({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl p-3 ${accent ? "bg-[#d6ff75] text-[#101a39]" : "bg-white/10"}`}><div className="flex items-center gap-2 text-xs opacity-70">{icon}{label}</div><p className="mt-1 text-lg font-bold tracking-tight">{value}</p></div>;
}
function SmallMetric({ label, value, lime = false }: { label: string; value: string; lime?: boolean }) {
  return <div className={`rounded-2xl px-3 py-2 ${lime ? "bg-[#efffc9]" : "bg-[#f3f5f8]"}`}><p className="text-neutral-400">{label}</p><p className="mt-0.5 font-bold text-[#101a39]">{value}</p></div>;
}
function Avatar({ name, image }: { name: string; image?: string }) {
  if (image) return <Image src={image} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full bg-neutral-100 object-cover" />;
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#101a39] text-sm font-bold text-[#d6ff75]">{name.slice(0, 1).toUpperCase()}</span>;
}
