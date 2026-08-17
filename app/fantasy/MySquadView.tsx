"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import type { DashboardResponse, Player, PlayerWithProbability } from "./types";
import { Pitch, puntosEnJornada } from "./Pitch";
import { PlayerDetails } from "./PlayerDetails";
import { SquadValueHistory } from "./SquadValueHistory";
import { millions, UNKNOWN } from "./format";

export function MySquadView({ data }: { data: DashboardResponse }) {
  const [selected, setSelected] = useState<Player | null>(null);
  return (
    <div className="space-y-4">
      <section className="glass-strong rounded-[28px] p-4 text-white">
        <div className="mb-4 flex items-center justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Tu once más probable</p><h2 className="mt-1 text-xl font-bold">{data.lineup.formation}</h2></div>
          <div className="rounded-2xl bg-white/[.06] px-3 py-2 text-right"><p className="text-[10px] text-white/45">Valor equipo</p><p className="font-bold text-white">{millions(data.me.teamValue)}</p></div>
        </div>
        {/*
          Puntos del once en la jornada en curso. Se suman SOLO los jugadores
          de los que consta puntuación; los que aún no tienen no cuentan como
          cero, y por eso se dice cuántos van contados.
        */}
        {data.currentWeek !== null && <ResumenJornada players={data.lineup.starters} jornada={data.currentWeek} enJuego={data.weekIsLive}/>}
        <Pitch starters={data.lineup.starters} jornada={data.currentWeek} onSelect={setSelected} />
        <p className="mt-3 flex gap-2 text-[11px] leading-4 text-white/45"><Info size={14} className="shrink-0" />Once calculado con porcentajes y titulares publicados por FútbolFantasy, dentro de una formación válida. No cambia tu alineación oficial.</p>
      </section>

      <SquadValueHistory
        leagueId={data.league.id}
        teamId={data.me.teamId}
        players={data.me.players}
        title="Toda tu plantilla"
        onPlayer={setSelected}
      />
      {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/**
 * Puntos del once en la jornada en curso.
 *
 * La suma solo incluye a quien YA tiene puntuación publicada. Un jugador sin
 * dato no suma cero: no suma. Por eso se dice "de 11" — así se distingue un
 * once que va a 0 puntos de un once del que todavía no se sabe nada.
 */
function ResumenJornada({ players, jornada, enJuego }: { players: PlayerWithProbability[]; jornada: number; enJuego: boolean }) {
  const conDato = players.filter((player) => puntosEnJornada(player, jornada) !== null);
  const total = conDato.reduce((suma, player) => suma + (puntosEnJornada(player, jornada) ?? 0), 0);
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-white/[.06] px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wider text-white/45">
          Jornada {jornada}{enJuego ? " · en juego" : ""}
        </span>
        <span className="block text-[11px] text-white/45">
          {conDato.length === 0
            ? "Todavía no hay puntos publicados"
            : `${conDato.length} de ${players.length} jugadores con puntuación`}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-2xl font-bold leading-none tabular-nums text-white">
          {conDato.length === 0 ? UNKNOWN : total}
        </span>
        <span className="block text-[10px] text-white/45">puntos</span>
      </span>
    </div>
  );
}
