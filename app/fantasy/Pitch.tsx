"use client";

import type { PlayerWithProbability } from "./types";
import { PlayerImage } from "./PlayerImage";
import { puntosEnJornada } from "./jornadas";
import { colorDeDificultad, useDificultad, type DificultadDeEquipo } from "./difficulty";
import { projectPlayerPoints } from "./projection";

export function Pitch({ starters, jornada, onSelect }: { starters: PlayerWithProbability[]; jornada: number | null; onSelect: (player: PlayerWithProbability) => void }) {
  const groups = groupByPosition(starters);
  const dificultad = useDificultad();
  const delJugador = (player: PlayerWithProbability) => player.teamId === undefined ? undefined : dificultad?.byTeam[player.teamId];
  const algunaDificultad = starters.some((player) => delJugador(player) !== undefined);

  return (
    <>
      <div className="relative overflow-hidden rounded-[26px] border border-emerald-300/10 bg-[radial-gradient(circle_at_50%_45%,rgba(39,128,78,.7),rgba(7,54,31,.98)_72%)] px-2 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_18px_50px_rgba(0,0,0,.35)]">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-35 [background:linear-gradient(90deg,transparent_49.7%,rgba(255,255,255,.16)_50%,transparent_50.3%)]" />
        <PitchLines />
        <div className="relative z-10 flex min-h-[530px] flex-col justify-between">
          {(["DEL", "MED", "DEF", "POR"] as const).map((position) => (
            <div key={position} className="flex justify-evenly gap-1">
              {(groups[position] ?? []).map((player) => (
                <PitchPlayer key={player.id} player={player} onSelect={onSelect} jornada={jornada} dificultad={delJugador(player)} />
              ))}
            </div>
          ))}
        </div>
      </div>
      {algunaDificultad && <p className="mt-2 text-[10px] leading-4 text-white/35">La dificultad usa el contexto del partido; la proyección combina rendimiento, contexto y titularidad.</p>}
    </>
  );
}

function groupByPosition(players: PlayerWithProbability[]) {
  return players.reduce<Partial<Record<PlayerWithProbability["position"], PlayerWithProbability[]>>>((groups, player) => {
    (groups[player.position] ??= []).push(player);
    return groups;
  }, {});
}

function PitchPlayer({ player, onSelect, jornada, dificultad }: { player: PlayerWithProbability; onSelect: (player: PlayerWithProbability) => void; jornada: number | null; dificultad?: DificultadDeEquipo }) {
  const puntos = jornada === null ? null : puntosEnJornada(player, jornada);
  const projection = projectPlayerPoints(player, dificultad);
  return (
    <button type="button" onClick={() => onSelect(player)} className="flex w-[74px] flex-col items-center text-center transition active:scale-95" aria-label={`Ver proyección e histórico de ${player.name}`}>
      <div className="relative rounded-full shadow-[0_8px_20px_rgba(0,0,0,.28)]">
        <PlayerImage player={player} size={54} />
        <Probability value={player.lineupProbability} expected={player.lineupExpectedStarter} />
        {puntos !== null && <span className="absolute -left-2 -top-1 rounded-full bg-[#7c3aed] px-1.5 py-0.5 text-[9px] font-black text-white shadow">{puntos}</span>}
      </div>
      <p className="mt-1.5 w-full truncate rounded-lg border border-white/5 bg-black/75 px-1.5 py-1 text-[10px] font-bold text-white shadow">{player.name}</p>
      {projection && <p className="mt-1 text-[9px] font-black tabular-nums text-white">Proy. {projection.points.toFixed(1)} <span className="font-semibold text-white/45">pts</span></p>}
      <p className="mt-0.5 text-[9px] font-semibold tabular-nums text-white/55">{(player.marketValue / 1_000_000).toFixed(1)} M€</p>
      {dificultad && <span className={`mt-1 w-full truncate text-[8px] font-bold ${colorDeDificultad(dificultad.probabilidadGanar)}`}>{dificultad.enCasa ? "vs" : "en"} {dificultad.rivalShortName}</span>}
    </button>
  );
}

function Probability({ value, expected }: { value?: number; expected?: boolean }) {
  const tone = expected || (value !== undefined && value >= 70) ? "bg-emerald-400 text-emerald-950" : value === undefined ? "bg-neutral-600 text-white" : value >= 40 ? "bg-amber-300 text-amber-950" : "bg-rose-400 text-rose-950";
  const label = value !== undefined ? `${value}%` : expected ? "TIT" : "?";
  return <span className={`absolute -bottom-1 -right-2 rounded-full border-2 border-[#0b3f27] px-1.5 py-0.5 text-[9px] font-black ${tone}`}>{label}</span>;
}

function PitchLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-3 rounded-xl border border-white/20">
      <span className="absolute left-1/2 top-0 h-full border-l border-white/20" />
      <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <span className="absolute left-1/2 top-0 h-16 w-36 -translate-x-1/2 border border-t-0 border-white/20" />
      <span className="absolute bottom-0 left-1/2 h-16 w-36 -translate-x-1/2 border border-b-0 border-white/20" />
    </div>
  );
}
