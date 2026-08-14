"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Banknote, Coins, Trophy, Users } from "lucide-react";
import Image from "next/image";
import type { DashboardResponse } from "./types";
import { millions, UNKNOWN } from "./format";

type Range = 7 | 30 | 90 | "MAX";
type PortfolioPoint = {
  date: string;
  // `null` = no lo publica LALIGA. Guardar 0 en el historico grabaria en disco
  // la misma mentira que se corrigio en pantalla: "este manager no tiene caja".
  managers: Record<string, { teamValue: number; teamMoney: number | null; netWorth: number | null }>;
};

const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
  { value: "MAX", label: "Todo" },
];

const historyCache = new Map<string, { signature: string; points: PortfolioPoint[] }>();
const subscribeHistory = () => () => undefined;

export function DashboardView({ data }: { data: DashboardResponse }) {
  const [range, setRange] = useState<Range>(30);
  const history = usePortfolioHistory(data);
  const visibleHistory = useMemo(() => filterHistory(history, range), [history, range]);
  const myPoints = visibleHistory.flatMap((point) => {
    const value = point.managers[data.me.teamId]?.teamValue;
    return value === undefined ? [] : [{ date: point.date, value }];
  });
  const delta = myPoints.length > 1 ? myPoints.at(-1)!.value - myPoints[0]!.value : null;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] border border-[#7c3aed]/30 bg-[linear-gradient(145deg,#17121f,#251440)] p-5 text-white shadow-[0_22px_65px_rgba(0,0,0,.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#a78bfa]">Valor de tu plantilla</p>
            <p className="mt-2 text-[36px] font-bold leading-none tracking-[-.04em]">{millions(data.me.teamValue)}</p>
            <p className={`mt-2 text-sm ${delta === null ? "text-white/45" : delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {delta === null ? "Seguimiento real iniciado" : `${delta >= 0 ? "+" : ""}${millions(delta)} en el periodo`}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[.06] px-3 py-2 text-center backdrop-blur">
            <Trophy size={17} className="mx-auto text-[#a78bfa]" />
            <p className="mt-1 text-lg font-bold">#{data.me.position ?? "—"}</p>
            <p className="text-[10px] text-white/55">posición</p>
          </div>
        </div>

        <RangePicker value={range} onChange={setRange} />
        <ValueChart points={myPoints} />

        <div className="mt-4 grid grid-cols-2 gap-2">
          {/* Las mismas dos cifras que en cada rival, para poder compararte de un vistazo. */}
          <Metric icon={<Coins size={16} />} label="Caja" value={millions(data.me.teamMoney)} accent />
          <Metric icon={<Banknote size={16} />} label="Valor equipo" value={millions(data.me.teamValue)} />
        </div>
        <p className="mt-3 text-[10px] leading-4 text-white/45">
          Valores oficiales guardados en este dispositivo. El seguimiento empieza en la primera visita; no reconstruimos ni inventamos fechas anteriores.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-400">Tu liga</p>
            <h2 className="text-xl font-bold tracking-tight text-white">Competidores</h2>
          </div>
          <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-neutral-300">
            <Users size={14} /> {data.competitors.length + 1}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.competitors.map((competitor) => {
            const points = visibleHistory.flatMap((point) => {
              const value = point.managers[competitor.teamId]?.teamValue;
              return value === undefined ? [] : [{ date: point.date, value }];
            });
            return (
              <article key={competitor.teamId} className="overflow-hidden rounded-[26px] border border-white/8 bg-[#121214] p-4 shadow-[0_10px_35px_rgba(0,0,0,.3)]">
                <div className="flex items-center gap-3">
                  <Avatar name={competitor.manager.name} image={competitor.manager.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{competitor.manager.name}</p>
                    <p className="text-xs text-neutral-400">#{competitor.position ?? "—"} · {competitor.points ?? "—"} pts</p>
                  </div>
                  <p className="text-sm font-bold text-white">{millions(competitor.teamValue)}</p>
                </div>
                <MiniChart points={points} />
                {/*
                  Dos cifras y ninguna mas: caja y valor del equipo. Es lo que se
                  viene a mirar aqui.

                  La caja de un rival NO la publica LALIGA (comprobado contra una
                  liga real: llega `null` en todos menos en el propio usuario), asi
                  que es una reconstruccion. Eso no se cuenta con un parrafo en
                  cada tarjeta — se marca con `~` y se explica una sola vez debajo
                  de la lista. Un simbolo basta para no dar por exacto lo que no
                  lo es; ocho parrafos identicos solo estorban.
                */}
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <SmallMetric
                    label="Caja"
                    value={competitor.teamMoney !== undefined ? millions(competitor.teamMoney) : UNKNOWN}
                    lime={competitor.teamMoney !== undefined}
                  />
                  <SmallMetric label="Valor equipo" value={millions(competitor.teamValue)} />
                </div>
              </article>
            );
          })}
        </div>
        {/*
          Aqui hubo una "caja estimada" (100 M + lo movido) y se retiro por estar
          sesgada, no por ser imprecisa.

          LALIGA solo publica la actividad de los ultimos dias. Quien construyo su
          plantilla ANTES de esa ventana no tiene gastos visibles y salia con caja
          alta; quien siguio operando dentro salia arruinado. Premiaba al que
          estuvo quieto. Medido en el unico caso comprobable: al usuario le
          calculaba 32,6 M cuando su caja real era 1,5 M.

          Un numero con ese sesgo es peor que un hueco: el hueco se nota, el sesgo
          no. Se muestra lo que consta y punto.
        */}
        <p className="mt-3 text-[11px] leading-4 text-neutral-500">
          LALIGA solo publica tu caja, no la de los demás. Reconstruirla desde la actividad
          disponible daría cifras infladas para quien fichó antes del
          {data.activityFrom ? ` ${data.activityFrom.slice(8, 10)}/${data.activityFrom.slice(5, 7)}` : " inicio del histórico"},
          así que no se muestra. En <strong>Economía</strong> tienes sus compras y ventas conocidas,
          con importes reales.
        </p>
      </section>
    </div>
  );
}

function usePortfolioHistory(data: DashboardResponse) {
  const current = useMemo(() => currentPoint(data), [data]);
  const serverHistory = useMemo(() => [current], [current]);
  const key = `ligalab:portfolio:v1:${data.league.id}`;
  const signature = JSON.stringify(current);
  const getSnapshot = useCallback(() => {
    const cached = historyCache.get(key);
    if (cached?.signature === signature) return cached.points;
    let stored: PortfolioPoint[] = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      stored = Array.isArray(parsed) ? parsed.filter(isPortfolioPoint) : [];
    } catch {
      stored = [];
    }
    const points = [...stored.filter((point) => point.date !== current.date), current]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-366);
    historyCache.set(key, { signature, points });
    return points;
  }, [current, key, signature]);
  const getServerSnapshot = useCallback(() => serverHistory, [serverHistory]);
  const history = useSyncExternalStore(subscribeHistory, getSnapshot, getServerSnapshot);
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(history));
    } catch { /* Safari puede bloquear almacenamiento privado; la pantalla sigue funcionando. */ }
  }, [history, key]);
  return history;
}

function currentPoint(data: DashboardResponse): PortfolioPoint {
  const current: PortfolioPoint = { date: localDate(), managers: {} };
  for (const team of [data.me, ...data.competitors]) {
    current.managers[team.teamId] = {
      teamValue: team.teamValue ?? 0,
      teamMoney: team.teamMoney ?? null,
      netWorth: null,
    };
  }
  return current;
}

function isPortfolioPoint(value: unknown): value is PortfolioPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<PortfolioPoint>;
  return typeof point.date === "string" && Boolean(point.managers && typeof point.managers === "object");
}

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function filterHistory(points: PortfolioPoint[], range: Range) {
  if (range === "MAX") return points;
  const first = new Date();
  first.setDate(first.getDate() - range + 1);
  const threshold = first.toISOString().slice(0, 10);
  return points.filter((point) => point.date >= threshold);
}

function RangePicker({ value, onChange }: { value: Range; onChange: (value: Range) => void }) {
  return <div className="mt-5 grid grid-cols-4 gap-1 rounded-2xl bg-white/[.06] p-1" aria-label="Periodo del histórico">{RANGE_OPTIONS.map((option) => <button key={String(option.value)} type="button" onClick={() => onChange(option.value)} className={`min-h-11 rounded-xl text-xs font-bold transition ${value === option.value ? "bg-[#7c3aed] text-white" : "text-white/55"}`} aria-pressed={value === option.value}>{option.label}</button>)}</div>;
}

function ValueChart({ points }: { points: { date: string; value: number }[] }) {
  if (points.length < 2) return <div className="mt-3 grid h-28 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 text-center text-xs leading-5 text-white/45">Necesitamos dos días reales para dibujar la evolución.</div>;
  const coords = chartCoordinates(points, 92, 72);
  const sube = (points.at(-1)?.value ?? 0) >= (points[0]?.value ?? 0);
  const color = sube ? "#34d399" : "#fb7185";
  return <div className="mt-3 h-32"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label="Histórico real del valor de plantilla"><defs><linearGradient id="valueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".3"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${coords} 100,100`} fill="url(#valueArea)"/><polyline points={coords} fill="none" stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/></svg></div>;
}

/*
 * El hueco de "todavia no hay historico" era una barra clara: en una pantalla
 * negra se leia como un error de carga. Ahora es un hueco oscuro CON TEXTO,
 * porque un espacio vacio no explica por que esta vacio.
 */
function MiniChart({ points }: { points: { date: string; value: number }[] }) {
  if (points.length < 2) return <p className="mt-3 grid h-8 place-items-center rounded-xl border border-dashed border-white/10 text-[10px] text-neutral-600">Sin histórico todavía</p>;
  const sube = (points.at(-1)?.value ?? 0) >= (points[0]?.value ?? 0);
  return <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="mt-3 h-8 w-full" role="img" aria-label="Evolución del competidor"><polyline points={chartCoordinates(points, 21, 18)} fill="none" stroke={sube ? "#34d399" : "#fb7185"} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function chartCoordinates(points: { value: number }[], bottom: number, height: number) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const range = Math.max(Math.max(...values) - min, 1);
  return points.map((point, index) => `${(index / (points.length - 1)) * 100},${bottom - ((point.value - min) / range) * height}`).join(" ");
}

function Metric({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl p-3 ${accent ? "bg-[#7c3aed]/20 ring-1 ring-[#7c3aed]/40" : "bg-white/[.06]"}`}><div className="flex items-center gap-2 text-xs text-white/60">{icon}{label}</div><p className={`mt-1 text-lg font-bold tracking-tight ${accent ? "text-[#c4b5fd]" : "text-white"}`}>{value}</p></div>;
}
function SmallMetric({ label, value, lime = false }: { label: string; value: string; lime?: boolean }) {
  return <div className={`rounded-2xl px-3 py-2 ${lime ? "bg-emerald-500/10" : "bg-white/[.04]"}`}><p className="text-neutral-500">{label}</p><p className={`mt-0.5 font-bold ${lime ? "text-emerald-400" : "text-white"}`}>{value}</p></div>;
}
function Avatar({ name, image }: { name: string; image?: string }) {
  if (image) return <Image src={image} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full bg-neutral-100 object-cover" />;
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#7c3aed]/20 text-sm font-bold text-[#c4b5fd]">{name.slice(0, 1).toUpperCase()}</span>;
}
