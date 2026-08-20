"use client";

import type { PlayerWithProbability } from "./types";
import { PlayerImage } from "./PlayerImage";
import { puntosEnJornada } from "./jornadas";
import { colorDeDificultad, useDificultad, type DificultadDeEquipo } from "./difficulty";

export function Pitch({ starters, jornada, onSelect }: { starters: PlayerWithProbability[]; jornada: number | null; onSelect: (player: PlayerWithProbability) => void }) {
  const groups = groupByPosition(starters);
  const dificultad = useDificultad();
  const delJugador = (player: PlayerWithProbability) => player.teamId === undefined ? undefined : dificultad?.byTeam[player.teamId];
  const algunaDificultad = starters.some((player) => delJugador(player) !== undefined);

  return (
    <>
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-300/15 bg-[radial-gradient(circle_at_50%_40%,rgba(36,153,91,.24),transparent_42%),linear-gradient(180deg,#0b5d35_0%,#073e25_100%)] px-2 py-5 shadow-[inset_0_0_40px_rgba(0,0,0,.28),0_18px_45px_rgba(0,0,0,.28)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <PitchLines />
        <div className="relative z-10 flex min-h-[530px] flex-col justify-between py-2">
          {(["DEL", "MED", "DEF", "POR"] as const).map((position) => (
            <div key={position} className="flex justify-evenly gap-1">
              {(groups[position] ?? []).map((player) => (
                <PitchPlayer key={player.id} player={player} onSelect={onSelect} jornada={jornada} dificultad={delJugador(player)} />
              ))}
            </div>
          ))}
        </div>
      </div>
      {algunaDificultad && (
        <p className="mt-2 text-[11px] leading-4 text-white/40">
          El color de dificultad resume el partido del equipo; toca un jugador para ver el detalle y su histórico.
        </p>
      )}
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
  return (
    <button type="button" onClick={() => onSelect(player)} className="flex w-[72px] flex-col items-center text-center transition active:scale-95" aria-label={`Ver histórico de ${player.name}`}>
      <div className="relative rounded-full bg-black/20 p-0.5 shadow-[0_8px_18px_rgba(0,0,0,.35)]">
        <PlayerImage player={player} size={54} />
        <Probability value={player.lineupProbability} expected={player.lineupExpectedStarter} />
        {puntos !== null && <span className="absolute -left-2 -top-1 rounded-full bg-[#7c3aed] px-1.5 py-0.5 text-[9px] font-black text-white shadow-[0_0_12px_rgba(124,58,237,.65)]">{puntos}</span>}
      </div>
      <p className="mt-1.5 w-full truncate rounded-lg border border-white/10 bg-black/75 px-1.5 py-1 text-[10px] font-bold text-white shadow-lg">{player.name}</p>
      <p className="mt-0.5 text-[9px] font-semibold text-white/60">{(player.marketValue / 1_000_000).toFixed(1).replace(".0", "")} M€</p>
      {dificultad && (
        <span className={`mt-1 w-full rounded-lg bg-black/65 px-1 py-0.5 text-[8px] font-bold leading-tight ${colorDeDificultad(dificultad.probabilidadGanar)}`}>
          <span className="block truncate text-white/65">{dificultad.enCasa ? "vs" : "en"} {dificultad.rivalShortName}</span>
        </span>
      )}
    </button>
  );
}

function Probability({ value, expected }: { value?: number; expected?: boolean }) {
  const tone = expected || (value !== undefined && value >= 70) ? "bg-emerald-400 text-emerald-950" : value === undefined ? "bg-neutral-600 text-white" : value >= 40 ? "bg-amber-300 text-amber-950" : "bg-rose-400 text-rose-950";
  const label = value !== undefined ? `${value}%` : expected ? "TIT" : "?";
  return <span className={`absolute -bottom-1 -right-2 rounded-full border-2 border-[#0b4b2e] px-1.5 py-0.5 text-[9px] font-black ${tone}`}>{label}</span>;
}

function PitchLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-3 rounded-2xl border border-white/22">
      <span className="absolute left-0 top-1/2 w-full border-t border-white/20" />
      <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <span className="absolute left-1/2 top-0 h-16 w-36 -translate-x-1/2 border border-t-0 border-white/20" />
      <span className="absolute bottom-0 left-1/2 h-16 w-36 -translate-x-1/2 border border-b-0 border-white/20" />
    </div>
  );
}
