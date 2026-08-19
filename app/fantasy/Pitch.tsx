"use client";

import type { PlayerWithProbability } from "./types";
import { PlayerImage } from "./PlayerImage";
import { puntosEnJornada } from "./jornadas";
import { colorDeDificultad, useDificultad, type DificultadDeEquipo } from "./difficulty";

/**
 * El campo con un once encima.
 *
 * Lo comparten tu plantilla y la de cada rival: si el dibujo viviera en cada
 * pantalla, con el tiempo dejarían de enseñar lo mismo y no habría forma de
 * comparar de un vistazo.
 */
export function Pitch({
  starters,
  jornada,
  onSelect,
}: {
  starters: PlayerWithProbability[];
  /** Jornada de la que se rotulan los puntos. `null` = no rotular ninguno. */
  jornada: number | null;
  onSelect: (player: PlayerWithProbability) => void;
}) {
  const groups = groupByPosition(starters);
  const dificultad = useDificultad();
  const delJugador = (player: PlayerWithProbability) =>
    player.teamId === undefined ? undefined : dificultad?.byTeam[player.teamId];
  // Solo se explica la etiqueta si alguien la lleva: un pie de foto sobre algo
  // que no se ve en pantalla es ruido.
  const algunaDificultad = starters.some((player) => delJugador(player) !== undefined);

  return (
    <>
      <div className="relative overflow-hidden rounded-[24px] border border-white/20 bg-[linear-gradient(180deg,#32845f,#1f6548)] px-2 py-5 shadow-inner">
        <PitchLines />
        <div className="relative z-10 flex min-h-[560px] flex-col justify-between">
          {(["DEL", "MED", "DEF", "POR"] as const).map((position) => (
            <div key={position} className="flex justify-evenly gap-1">
              {(groups[position] ?? []).map((player) => (
                <PitchPlayer
                  key={player.id}
                  player={player}
                  onSelect={onSelect}
                  jornada={jornada}
                  dificultad={delJugador(player)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {algunaDificultad && (
        <p className="mt-2 text-[11px] leading-4 text-white/45">
          Debajo de cada nombre, contra quién juega su equipo y lo difícil que lo tiene según las
          cuotas de una casa de apuestas. Es su precio, no un pronóstico nuestro, y habla del equipo:
          no dice cuántos puntos hará el jugador. Toca a cualquiera para ver las cuotas.
        </p>
      )}
    </>
  );
}

function groupByPosition(players: PlayerWithProbability[]) {
  return players.reduce<Partial<Record<PlayerWithProbability["position"], PlayerWithProbability[]>>>(
    (groups, player) => {
      (groups[player.position] ??= []).push(player);
      return groups;
    },
    {},
  );
}

function PitchPlayer({
  player,
  onSelect,
  jornada,
  dificultad,
}: {
  player: PlayerWithProbability;
  onSelect: (player: PlayerWithProbability) => void;
  jornada: number | null;
  /** Su partido de esta jornada. Ausente = sin cuotas, y entonces no se rotula. */
  dificultad?: DificultadDeEquipo;
}) {
  const puntos = jornada === null ? null : puntosEnJornada(player, jornada);
  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      className="flex w-[72px] flex-col items-center text-center active:scale-95"
      aria-label={
        dificultad
          ? `Ver histórico de ${player.name}. Su equipo juega ${dificultad.enCasa ? "en casa" : "fuera"} contra ${dificultad.rivalName}: ${dificultad.etiqueta}.`
          : `Ver histórico de ${player.name}`
      }
    >
      <div className="relative">
        <PlayerImage player={player} size={52} />
        <Probability value={player.lineupProbability} expected={player.lineupExpectedStarter} />
        {/* Los puntos de la jornada solo salen si constan. Sin dato, nada: un
            jugador sin puntuar no es un jugador con cero. */}
        {puntos !== null && (
          <span className="absolute -left-2 -top-1 rounded-full bg-[#7c3aed] px-1.5 py-0.5 text-[9px] font-black text-white shadow">
            {puntos}
          </span>
        )}
      </div>
      <p className="mt-1.5 w-full truncate rounded-lg bg-black/70 px-1.5 py-1 text-[10px] font-semibold shadow">
        {player.name}
      </p>
      {/*
        Rival y dificultad, en palabras. El color acompaña, no sustituye: quien
        no distinga el verde del rojo lee «Muy difícil» igual.
      */}
      {dificultad && (
        <span
          className={`mt-1 w-full rounded-lg bg-black/70 px-1 py-0.5 text-[8px] font-bold leading-tight shadow ${colorDeDificultad(dificultad.probabilidadGanar)}`}
        >
          <span className="block truncate text-white/70">
            {dificultad.enCasa ? "vs" : "en"} {dificultad.rivalShortName}
          </span>
          <span className="block truncate">{dificultad.etiqueta}</span>
        </span>
      )}
    </button>
  );
}

/** `TIT` es una señal publicada sin porcentaje; `?` significa que no hay ninguna señal. */
function Probability({ value, expected }: { value?: number; expected?: boolean }) {
  const tone =
    expected || (value !== undefined && value >= 70)
      ? "bg-emerald-400 text-emerald-950"
      : value === undefined
        ? "bg-neutral-600 text-white"
        : value >= 40
          ? "bg-amber-300 text-amber-950"
          : "bg-rose-400 text-rose-950";
  const label = value !== undefined ? `${value}%` : expected ? "TIT" : "?";
  return (
    <span className={`absolute -bottom-1 -right-2 rounded-full border-2 border-[#286f50] px-1.5 py-0.5 text-[9px] font-black ${tone}`}>
      {label}
    </span>
  );
}

function PitchLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-3 rounded-xl border border-white/25">
      <span className="absolute left-1/2 top-0 h-full border-l border-white/25" />
      <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      <span className="absolute left-1/2 top-0 h-16 w-36 -translate-x-1/2 border border-t-0 border-white/25" />
      <span className="absolute bottom-0 left-1/2 h-16 w-36 -translate-x-1/2 border border-b-0 border-white/25" />
    </div>
  );
}
