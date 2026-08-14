"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import type { DashboardResponse, PlayerWithProbability } from "./types";
import { PlayerImage } from "./PlayerImage";
import { PlayerDetails } from "./PlayerDetails";
import { millions } from "./format";

export function MySquadView({ data }: { data: DashboardResponse }) {
  const [showBench, setShowBench] = useState(true);
  const [selected, setSelected] = useState<PlayerWithProbability | null>(null);
  const groups = groupByPosition(data.lineup.starters);
  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-[#7c3aed]/30 bg-[linear-gradient(145deg,#17121f,#251440)] p-4 text-white shadow-[0_22px_65px_rgba(0,0,0,.45)]">
        <div className="mb-4 flex items-center justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Tu once más probable</p><h2 className="mt-1 text-xl font-bold">{data.lineup.formation}</h2></div>
          <div className="rounded-2xl bg-white/[.06] px-3 py-2 text-right"><p className="text-[10px] text-white/45">Valor equipo</p><p className="font-bold text-white">{millions(data.me.teamValue)}</p></div>
        </div>
        <div className="relative overflow-hidden rounded-[24px] border border-white/20 bg-[linear-gradient(180deg,#32845f,#1f6548)] px-2 py-5 shadow-inner">
          <PitchLines />
          <div className="relative z-10 flex min-h-[520px] flex-col justify-between">
            {(["DEL", "MED", "DEF", "POR"] as const).map((position) => (
              <div key={position} className="flex justify-evenly gap-1">
                {(groups[position] ?? []).map((player) => <PitchPlayer key={player.id} player={player} onSelect={setSelected} />)}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 flex gap-2 text-[11px] leading-4 text-white/45"><Info size={14} className="shrink-0" />Once calculado por porcentaje de FútbolFantasy y formación válida. No cambia tu alineación oficial.</p>
      </section>

      <section className="rounded-[26px] border border-white/8 bg-[#121214] p-4 shadow-[0_10px_35px_rgba(0,0,0,.3)]">
        <button type="button" onClick={() => setShowBench((value) => !value)} className="flex w-full items-center justify-between text-left">
          <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-500">Resto de plantilla</p><h3 className="text-lg font-bold text-white">Banquillo · {data.lineup.bench.length}</h3></div>
          <ChevronDown className={`transition ${showBench ? "rotate-180" : ""}`} />
        </button>
        {showBench && <div className="mt-3 space-y-2">{data.lineup.bench.map((player) => <BenchPlayer key={player.id} player={player} onSelect={setSelected} />)}</div>}
      </section>
      {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function groupByPosition(players: PlayerWithProbability[]) {
  return players.reduce<Partial<Record<PlayerWithProbability["position"], PlayerWithProbability[]>>>((groups, player) => {
    (groups[player.position] ??= []).push(player);
    return groups;
  }, {});
}
function PitchPlayer({ player, onSelect }: { player: PlayerWithProbability; onSelect: (player: PlayerWithProbability) => void }) {
  return <button type="button" onClick={() => onSelect(player)} className="flex w-[72px] flex-col items-center text-center active:scale-95" aria-label={`Ver histórico de ${player.name}`}><div className="relative"><PlayerImage player={player} size={52}/><Probability value={player.lineupProbability}/></div><p className="mt-1.5 w-full truncate rounded-lg bg-black/70 px-1.5 py-1 text-[10px] font-semibold shadow">{player.name}</p></button>;
}
/** `?` cuando FutbolFantasy no publica al jugador: no se rellena con un cero. */
function Probability({ value }: { value?: number }) {
  const tone = value === undefined ? "bg-neutral-600 text-white" : value >= 70 ? "bg-emerald-400 text-emerald-950" : value >= 40 ? "bg-amber-300 text-amber-950" : "bg-rose-400 text-rose-950";
  return <span className={`absolute -bottom-1 -right-2 rounded-full border-2 border-[#286f50] px-1.5 py-0.5 text-[9px] font-black ${tone}`}>{value === undefined ? "?" : `${value}%`}</span>;
}
function BenchPlayer({ player, onSelect }: { player: PlayerWithProbability; onSelect: (player: PlayerWithProbability) => void }) {
  return <button type="button" onClick={() => onSelect(player)} className="flex w-full items-center gap-3 rounded-2xl bg-white/[.04] p-2.5 text-left active:scale-[.99]" aria-label={`Ver histórico de ${player.name}`}><PlayerImage player={player} size={42}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{player.name}</p><p className="text-xs text-neutral-500">{player.position} · {player.team} · {millions(player.marketValue)}</p></div><span className="rounded-full bg-[#7c3aed]/15 px-2.5 py-1 text-xs font-bold text-[#c4b5fd]">{player.lineupProbability === undefined ? "—" : `${player.lineupProbability}%`}</span></button>;
}
function PitchLines() {
  return <div aria-hidden className="pointer-events-none absolute inset-3 rounded-xl border border-white/25"><span className="absolute left-1/2 top-0 h-full border-l border-white/25"/><span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25"/><span className="absolute left-1/2 top-0 h-16 w-36 -translate-x-1/2 border border-t-0 border-white/25"/><span className="absolute bottom-0 left-1/2 h-16 w-36 -translate-x-1/2 border border-b-0 border-white/25"/></div>;
}
