"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useDificultad } from "./difficulty";
import { cambiosSugeridos, onceDado, onceOptimo, predecirJugadores, type Cambio, type Once } from "./prediccion";
import type { Projection } from "./projection";
import type { DashboardResponse } from "./types";

/**
 * El predictor de la jornada: cálculo (`usePrediccion`) y resumen de arriba
 * (`PrediccionResumen`). El once con los puntos de cada uno lo pinta el campo.
 */

export type Prediccion = {
  optimo: Once | null;
  actual: Once;
  cambios: Cambio[];
  proyecciones: Map<string, Projection | null>;
  jornada: number | null;
};

export function usePrediccion(data: DashboardResponse): Prediccion {
  const dificultad = useDificultad();
  const jugadores = data.me?.players;
  const lineup = data.lineup;
  const porEquipo = dificultad?.byTeam ?? null;
  const calculo = useMemo(() => {
    const predichos = predecirJugadores(Array.isArray(jugadores) ? jugadores : [], porEquipo);
    const optimo = onceOptimo(predichos);
    const actual = onceDado(lineup?.formation ?? "", (lineup?.starters ?? []).map((p) => p.id), predichos);
    return {
      optimo,
      actual,
      cambios: optimo ? cambiosSugeridos(actual, optimo) : [],
      proyecciones: new Map(predichos.map((j) => [j.player.id, j.proyeccion])),
    };
  }, [jugadores, lineup, porEquipo]);
  return { ...calculo, jornada: dificultad?.week ?? data.currentWeek };
}

export function PrediccionResumen({ prediccion }: { prediccion: Prediccion }) {
  const { optimo, actual, cambios, jornada } = prediccion;
  const total = useCuentaHasta(optimo?.total ?? 0);
  if (!optimo) return null;
  const ganancia = Math.round((optimo.total - actual.total) * 10) / 10;

  return <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#1a1240_0%,#26195a_55%,#321f74_100%)] p-5 text-white shadow-[0_24px_70px_rgba(40,20,90,.28)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">Tu predicción{jornada ? ` · jornada ${jornada}` : ""}</p>
        <p className="mt-2 text-[44px] font-bold leading-none tracking-[-.04em] tabular-nums">≈ {fmt(total)} <span className="text-lg font-semibold text-white/60">pts</span></p>
        <p className="mt-1.5 text-sm text-white/60">entre {fmt(optimo.bajo)} y {fmt(optimo.alto)} · {optimo.formacion}</p>
      </div>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#d6ff75]"><Sparkles size={22} /></span>
    </div>

    {cambios.length > 0 && ganancia > 0 ? <div className="mt-4 rounded-2xl bg-white/[.07] p-3">
      <p className="text-xs font-semibold text-white/70">
        Alinea así y sumas ≈ <span className="text-[#d6ff75]">+{fmt(ganancia)} pts</span>
        {actual.formacion && optimo.formacion !== actual.formacion.replace(/^1-/, "") ? <> · pasa de {actual.formacion.replace(/^1-/, "")} a {optimo.formacion}</> : null}
      </p>
      <ul className="mt-2 space-y-1.5">{cambios.slice(0, 3).map((c) => <li key={c.entra.player.id} className="flex items-center gap-2 text-sm">
        <span className="min-w-0 truncate font-bold text-[#d6ff75]">{c.entra.player.name}</span>
        {c.sale && <><ArrowRight size={14} className="shrink-0 text-white/40" /><span className="min-w-0 truncate text-white/55">por {c.sale.player.name}</span></>}
      </li>)}</ul>
    </div> : <p className="mt-4 rounded-2xl bg-white/[.07] px-3 py-2.5 text-xs text-white/70">Tu once más probable ya es el que más suma.</p>}
  </section>;
}

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

/** Sube el número hasta su valor en ~0,6 s. Sin animación si el sistema pide menos movimiento. */
function useCuentaHasta(objetivo: number): number {
  const [valor, setValor] = useState(objetivo);
  const desde = useRef(0);
  useEffect(() => {
    const quieto = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const inicio = desde.current;
    desde.current = objetivo;
    if (quieto || inicio === objetivo) { setValor(objetivo); return; }
    let frame = 0;
    const t0 = performance.now();
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / 600);
      const suave = 1 - Math.pow(1 - p, 3);
      setValor(inicio + (objetivo - inicio) * suave);
      if (p < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [objetivo]);
  return valor;
}
