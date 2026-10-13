"use client";

import { useMemo, useState } from "react";
import { HeartPulse } from "lucide-react";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";
import type { Player } from "./types";
import { Empty } from "./ui";

/** Lesionados, sancionados, en duda y apercibidos de LaLiga, con su dueño en tu liga. */

type Baja = { player: Player; motivo: string; amarillas: number[] | null; dueno: { managerName: string; esMio: boolean } | null };
export type BajasResponse = { bajas: Baja[]; apercibidosDisponibles: boolean };

const MOTIVOS: Record<string, { texto: string; tono: string }> = {
  injured: { texto: "Lesionado", tono: "bg-rose-500/15 text-rose-300" },
  suspended: { texto: "Sancionado", tono: "bg-rose-500/15 text-rose-300" },
  doubtful: { texto: "En duda", tono: "bg-amber-400/15 text-amber-200" },
  apercibido: { texto: "Apercibido", tono: "bg-yellow-300/15 text-yellow-200" },
};
type Filtro = "MIOS" | "LIGA" | "TODOS";

export function BajasView({ data }: { data: BajasResponse }) {
  const [filtro, setFiltro] = useState<Filtro>("MIOS");
  const [motivo, setMotivo] = useState<string>("TODOS");
  const [selected, setSelected] = useState<Player | null>(null);
  const bajas = useMemo(() => (Array.isArray(data.bajas) ? data.bajas : []), [data.bajas]);
  const mias = bajas.filter((b) => b.dueno?.esMio).length;

  const visibles = useMemo(() => bajas
    .filter((b) => filtro === "TODOS" || (filtro === "MIOS" ? b.dueno?.esMio : b.dueno !== null))
    .filter((b) => motivo === "TODOS" || b.motivo === motivo)
    .sort((a, b) => Number(b.dueno?.esMio ?? false) - Number(a.dueno?.esMio ?? false) || b.player.marketValue - a.player.marketValue), [bajas, filtro, motivo]);

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#2a0f14_0%,#3b1220_55%,#4a1528_100%)] p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">Bajas de LaLiga</p>
          <p className="mt-2 text-[34px] font-bold leading-none tracking-[-.04em]">{mias} <span className="text-lg font-semibold text-white/60">{mias === 1 ? "te afecta" : "te afectan"}</span></p>
          <p className="mt-2 text-sm text-white/60">Lesionados, sancionados, en duda y a una amarilla de sanción.</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-rose-300"><HeartPulse size={22} /></span>
      </div>
    </section>

    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/[.05] p-1">{([["MIOS", "Mis jugadores"], ["LIGA", "Mi liga"], ["TODOS", "Toda LaLiga"]] as const).map(([id, label]) =>
      <button key={id} type="button" onClick={() => setFiltro(id)} aria-pressed={filtro === id} className={`min-h-11 rounded-xl text-xs font-bold ${filtro === id ? "bg-[#7c3aed] text-white" : "text-white/50"}`}>{label}</button>)}</div>
    <div className="flex flex-wrap gap-2">{[["TODOS", "Todas"], ["injured", "Lesionados"], ["suspended", "Sancionados"], ["doubtful", "En duda"], ["apercibido", "Apercibidos"]].map(([id, label]) =>
      <button key={id} type="button" onClick={() => setMotivo(id!)} aria-pressed={motivo === id} className={`min-h-10 grow rounded-2xl px-3 text-xs font-bold ${motivo === id ? "bg-white/15 text-white ring-1 ring-white/20" : "glass text-neutral-500"}`}>{label}</button>)}</div>

    {visibles.length === 0
      ? <Empty>{filtro === "MIOS" ? "Ningún jugador tuyo está de baja ni apercibido." : "No hay bajas con este filtro."}</Empty>
      : <div className="ll-stagger space-y-2">{visibles.map((b) => {
        const m = MOTIVOS[b.motivo] ?? MOTIVOS.doubtful!;
        return <button key={`${b.player.id}-${b.motivo}`} type="button" onClick={() => setSelected(b.player)} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-[#0d0d10] p-3 text-left">
          <PlayerImage player={b.player} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-white">{b.player.name}</p>
            <p className="truncate text-[11px] text-neutral-500">{b.player.position} · {b.player.team} · {b.dueno ? (b.dueno.esMio ? "tuyo" : b.dueno.managerName) : "sin dueño"}{b.amarillas?.length ? ` · amarillas J${b.amarillas.join(", J")}` : ""}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${m.tono}`}>{m.texto}</span>
        </button>;
      })}</div>}

    <p className="rounded-2xl glass px-4 py-3 text-xs leading-5 text-neutral-500">
      Lesionados, sancionados y en duda: estado oficial de LALIGA Fantasy. Apercibidos (a una amarilla de cumplir sanción): FútbolFantasy
      {data.apercibidosDisponibles ? "" : " — ahora mismo no ha respondido, así que no salen"}.
    </p>
    {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)} /> : null}
  </div>;
}
