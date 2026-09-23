"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useDificultad } from "./difficulty";
import { cambiosSugeridos, onceDado, onceOptimo, predecirJugadores, type JugadorPredicho } from "./prediccion";
import type { DashboardResponse } from "./types";

/**
 * Predicción de la jornada en Plantilla: puntos ≈ de tu once, el once que más
 * suma y qué cambiar para llegar a él. Cálculo en `prediccion.ts`.
 */

const CONFIANZA: Record<string, string> = { Alta: "bg-emerald-400", Media: "bg-amber-300", Baja: "bg-neutral-500" };

export function PrediccionCard({ data }: { data: DashboardResponse }) {
  const dificultad = useDificultad();
  const [verTodos, setVerTodos] = useState(false);

  const jugadores = data.me?.players;
  const lineup = data.lineup;
  const porEquipo = dificultad?.byTeam ?? null;
  const { actual, optimo, cambios } = useMemo(() => {
    const predichos = predecirJugadores(Array.isArray(jugadores) ? jugadores : [], porEquipo);
    const optimo = onceOptimo(predichos);
    const actual = onceDado(lineup?.formation ?? "", (lineup?.starters ?? []).map((p) => p.id), predichos);
    return { actual, optimo, cambios: optimo ? cambiosSugeridos(actual, optimo) : [] };
  }, [jugadores, lineup, porEquipo]);

  if (!optimo) return null;
  const ganancia = Math.round((optimo.total - actual.total) * 10) / 10;
  const jornada = dificultad?.week ?? data.currentWeek;

  return <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#1a1240_0%,#26195a_55%,#321f74_100%)] p-5 text-white shadow-[0_24px_70px_rgba(40,20,90,.28)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">Predicción{jornada ? ` · jornada ${jornada}` : ""}</p>
        <p className="mt-2 text-[40px] font-bold leading-none tracking-[-.04em]">≈ {fmt(optimo.total)} <span className="text-lg font-semibold text-white/60">pts</span></p>
        <p className="mt-1 text-sm text-white/60">entre {fmt(optimo.bajo)} y {fmt(optimo.alto)} · mejor once {optimo.formacion}</p>
      </div>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#c4b5fd]"><Sparkles size={22} /></span>
    </div>

    {cambios.length > 0 ? <div className="mt-4 rounded-2xl bg-white/[.07] p-3">
      <p className="text-xs font-semibold text-white/70">Con estos cambios sumas ≈ +{fmt(ganancia)} pts sobre el once más probable ({fmt(actual.total)}):</p>
      <ul className="mt-2 space-y-1.5">{cambios.map((c) => <li key={c.entra.player.id} className="flex items-center gap-2 text-sm">
        <span className="min-w-0 truncate font-bold text-emerald-300">{c.entra.player.name} <span className="font-semibold text-white/50">{fmt(c.entra.proyeccion?.points ?? 0)}</span></span>
        {c.sale && <><ArrowRight size={14} className="shrink-0 text-white/40" /><span className="min-w-0 truncate text-rose-300/90">por {c.sale.player.name} <span className="text-white/50">{fmt(c.sale.proyeccion?.points ?? 0)}</span></span></>}
      </li>)}</ul>
    </div> : <p className="mt-4 rounded-2xl bg-white/[.07] px-3 py-2.5 text-xs text-white/70">Tu once más probable ya es el que más puntos suma.</p>}

    <button type="button" onClick={() => setVerTodos((v) => !v)} aria-expanded={verTodos} className="mt-3 min-h-11 w-full rounded-2xl border border-white/10 text-xs font-bold text-white/80">{verTodos ? "Ocultar detalle" : "Ver la predicción de cada jugador"}</button>
    {verTodos && <div className="mt-3 space-y-1">
      {optimo.titulares.slice().sort((a, b) => ORDEN[a.player.position] - ORDEN[b.player.position]).map((j) => <Fila key={j.player.id} j={j} titular />)}
      <p className="pt-2 text-[10px] font-semibold uppercase tracking-[.14em] text-white/40">Suplentes</p>
      {optimo.suplentes.map((j) => <Fila key={j.player.id} j={j} />)}
    </div>}

    <p className="mt-3 text-[11px] leading-4 text-white/45">
      Estimación, no dato: combina la media de la temporada, la forma de las últimas jornadas, si juega en casa, las cuotas del
      partido y la probabilidad de titular de FútbolFantasy. Quien probablemente no juega cuenta casi cero. No cambia tu
      alineación oficial.{optimo.sinDatos > 0 ? ` ${optimo.sinDatos} titular sin media publicada cuenta como 0.` : ""}
    </p>
  </section>;
}

const ORDEN: Record<string, number> = { POR: 0, DEF: 1, MED: 2, DEL: 3 };
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

function Fila({ j, titular = false }: { j: JugadorPredicho; titular?: boolean }) {
  const p = j.proyeccion;
  return <div className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${titular ? "bg-white/[.05]" : ""}`}>
    <span className="w-8 shrink-0 text-[10px] font-bold text-white/40">{j.player.position}</span>
    <span className={`h-2 w-2 shrink-0 rounded-full ${p ? CONFIANZA[p.confidence] : "bg-neutral-700"}`} title={p ? `Confianza ${p.confidence.toLowerCase()}` : "Sin datos"} />
    <span className={`min-w-0 flex-1 truncate ${titular ? "font-semibold text-white" : "text-white/60"}`}>{j.player.name}</span>
    {p?.lineupProbability !== undefined && <span className="shrink-0 text-[10px] text-white/40">{p.lineupProbability}%</span>}
    <span className="w-12 shrink-0 text-right font-bold tabular-nums">{p ? fmt(p.points) : "—"}</span>
  </div>;
}
