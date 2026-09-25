"use client";

import type { PlayerWithProbability } from "./types";
import { PlayerImage } from "./PlayerImage";
import { puntosEnJornada } from "./jornadas";
import { colorDeDificultad, useDificultad, type DificultadDeEquipo } from "./difficulty";
import type { Projection } from "./projection";

/**
 * El campo con el once.
 *
 * Portero ARRIBA y delanteros abajo: se lee de arriba abajo como una
 * alineación escrita (POR, DEF, MED, DEL). Antes iba al revés y costaba
 * encontrar a cada uno.
 *
 * Dos modos, según lo que se le pase:
 *   - `proyecciones`: cada jugador lleva sus puntos PREVISTOS, bien grandes.
 *   - `jornada`: cada jugador lleva los puntos REALES de esa jornada.
 */

const LINEAS = ["POR", "DEF", "MED", "DEL"] as const;

export function Pitch({
  starters,
  jornada = null,
  proyecciones,
  destacados,
  onSelect,
}: {
  starters: PlayerWithProbability[];
  jornada?: number | null;
  proyecciones?: Map<string, Projection | null>;
  /** Jugadores que entran respecto al once probable: se marcan. */
  destacados?: Set<string>;
  onSelect: (player: PlayerWithProbability) => void;
}) {
  const groups = groupByPosition(starters);
  const dificultad = useDificultad();
  const delJugador = (player: PlayerWithProbability) => (player.teamId === undefined ? undefined : dificultad?.byTeam[player.teamId]);

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-emerald-300/10 bg-[radial-gradient(circle_at_50%_55%,rgba(39,128,78,.7),rgba(7,54,31,.98)_72%)] px-2 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_18px_50px_rgba(0,0,0,.35)]">
      <PitchLines />
      <div className="ll-stagger relative z-10 flex min-h-[500px] flex-col justify-between gap-3">
        {LINEAS.map((position) => (
          <div key={position} className="flex justify-evenly gap-1">
            {(groups[position] ?? []).map((player) => (
              <PitchPlayer
                key={player.id}
                player={player}
                onSelect={onSelect}
                jornada={jornada}
                proyeccion={proyecciones?.get(player.id)}
                modoPrediccion={proyecciones !== undefined}
                destacado={destacados?.has(player.id) ?? false}
                dificultad={delJugador(player)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupByPosition(players: PlayerWithProbability[]) {
  return players.reduce<Partial<Record<PlayerWithProbability["position"], PlayerWithProbability[]>>>((groups, player) => {
    (groups[player.position] ??= []).push(player);
    return groups;
  }, {});
}

function PitchPlayer({
  player, onSelect, jornada, proyeccion, modoPrediccion, destacado, dificultad,
}: {
  player: PlayerWithProbability;
  onSelect: (player: PlayerWithProbability) => void;
  jornada: number | null;
  proyeccion?: Projection | null;
  modoPrediccion: boolean;
  destacado: boolean;
  dificultad?: DificultadDeEquipo;
}) {
  const puntos = !modoPrediccion && jornada !== null ? puntosEnJornada(player, jornada) : null;
  return (
    <button type="button" onClick={() => onSelect(player)} className="flex w-[74px] flex-col items-center text-center transition-transform duration-150 active:scale-95" aria-label={`Ver ficha de ${player.name}`}>
      <div className={`relative rounded-full shadow-[0_8px_20px_rgba(0,0,0,.28)] ${destacado ? "ring-2 ring-[#d6ff75] ring-offset-2 ring-offset-[#0b3f27]" : ""}`}>
        <PlayerImage player={player} size={52} />
        <Probability value={player.lineupProbability} expected={player.lineupExpectedStarter} />
        {puntos !== null && <span className="absolute -left-2 -top-1 rounded-full bg-[#7c3aed] px-1.5 py-0.5 text-[10px] font-black text-white shadow">{puntos}</span>}
      </div>
      <p className="mt-1.5 w-full truncate rounded-lg border border-white/5 bg-black/70 px-1.5 py-1 text-[10px] font-bold text-white shadow">{player.name}</p>
      {modoPrediccion && (
        <p className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums ${proyeccion ? "bg-[#d6ff75] text-[#101a39]" : "bg-white/10 text-white/60"}`}>
          {proyeccion ? proyeccion.points.toFixed(1).replace(".", ",") : "—"}
        </p>
      )}
      {dificultad && <span className={`mt-1 w-full truncate text-[9px] font-bold ${colorDeDificultad(dificultad.probabilidadGanar)}`}>{dificultad.enCasa ? "vs" : "en"} {dificultad.rivalShortName}</span>}
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
      <span className="absolute left-0 top-1/2 w-full border-t border-white/20" />
      <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <span className="absolute left-1/2 top-0 h-16 w-36 -translate-x-1/2 border border-t-0 border-white/20" />
      <span className="absolute bottom-0 left-1/2 h-16 w-36 -translate-x-1/2 border border-b-0 border-white/20" />
    </div>
  );
}
