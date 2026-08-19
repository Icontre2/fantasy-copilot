"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { DashboardResponse, Player, PlayerWithProbability } from "./types";
import { Pitch } from "./Pitch";
import { PlayerDetails } from "./PlayerDetails";
import { SquadValueHistory } from "./SquadValueHistory";
import { jornadasDisponibles, puntosDelOnce } from "./jornadas";
import { millions, UNKNOWN } from "./format";

export function MySquadView({ data }: { data: DashboardResponse }) {
  const [selected, setSelected] = useState<Player | null>(null);
  const jornadas = useMemo(
    () => jornadasDisponibles(data.me.players, data.currentWeek),
    [data.me.players, data.currentWeek],
  );
  /*
   * Arranca en la jornada en curso, que es lo que se viene a mirar. Si LALIGA
   * no publica cuál es, en la última cerrada; y si no hay ninguna, en `null` y
   * el campo no rotula puntos en vez de rotular ceros.
   */
  const [jornada, setJornada] = useState<number | null>(
    data.currentWeek ?? jornadas.at(-1) ?? null,
  );
  const elegida = jornada !== null && jornadas.includes(jornada) ? jornada : null;

  return (
    <div className="space-y-4">
      <section className="glass-strong rounded-[28px] p-4 text-white">
        <div className="mb-4 flex items-center justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Tu once más probable</p><h2 className="mt-1 text-xl font-bold">{data.lineup.formation}</h2></div>
          <div className="rounded-2xl bg-white/[.06] px-3 py-2 text-right"><p className="text-[10px] text-white/45">Valor equipo</p><p className="font-bold text-white">{millions(data.me.teamValue)}</p></div>
        </div>

        <SelectorDeJornada
          jornadas={jornadas}
          elegida={elegida}
          enCurso={data.currentWeek}
          onElegir={setJornada}
        />
        {elegida !== null && (
          <ResumenJornada
            players={data.lineup.starters}
            jornada={elegida}
            enJuego={data.weekIsLive && elegida === data.currentWeek}
          />
        )}

        <Pitch starters={data.lineup.starters} jornada={elegida} onSelect={setSelected} />

        {/*
          Las dos cifras que lleva cada jugador encima se leen distinto y hasta
          ahora la pantalla no lo decía en ninguna parte: el porcentaje es una
          previsión de la PRÓXIMA alineación y no cambia al elegir jornada; el
          número morado son los puntos REALES de la jornada seleccionada.
        */}
        <p className="mt-3 flex gap-2 text-[11px] leading-4 text-white/45">
          <Info size={14} className="shrink-0" />
          <span>
            El <strong className="text-white/70">%</strong> de cada jugador es su probabilidad de ser
            titular en el próximo partido, según FútbolFantasy: mira hacia delante y no cambia al
            elegir jornada. El número morado sí son los puntos que hizo en la jornada elegida. El
            once es un cálculo dentro de una formación válida y no toca tu alineación oficial.
          </span>
        </p>
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
 * De qué jornada se está hablando.
 *
 * En rejilla y no en scroll lateral, igual que los filtros de Alertas: con 38
 * jornadas un carrusel deja la mitad detrás del borde y nadie las encuentra.
 */
function SelectorDeJornada({
  jornadas,
  elegida,
  enCurso,
  onElegir,
}: {
  jornadas: number[];
  elegida: number | null;
  enCurso: number | null;
  onElegir: (jornada: number) => void;
}) {
  if (jornadas.length === 0) {
    return (
      <p className="mb-4 rounded-2xl bg-white/[.06] px-3 py-2.5 text-[11px] leading-4 text-white/45">
        Todavía no hay ninguna jornada cerrada, así que no hay puntos que enseñar por jornada.
      </p>
    );
  }
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/45">Puntos de la jornada</p>
      <div className="flex flex-wrap gap-1.5" aria-label="Elegir jornada">
        {jornadas.map((numero) => (
          <button
            key={numero}
            type="button"
            onClick={() => onElegir(numero)}
            aria-pressed={elegida === numero}
            className={`min-h-11 min-w-11 rounded-xl px-2.5 text-xs font-bold transition ${
              elegida === numero ? "bg-[#7c3aed] text-white" : "bg-white/[.06] text-white/55"
            }`}
          >
            J{numero}
            {numero === enCurso && <span className="ml-1 text-[9px] font-medium opacity-70">hoy</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Puntos del once en la jornada elegida.
 *
 * La suma solo incluye a quien YA tiene puntuación publicada. Un jugador sin
 * dato no suma cero: no suma. Por eso se dice "de 11" — así se distingue un
 * once que va a 0 puntos de un once del que todavía no se sabe nada.
 */
function ResumenJornada({ players, jornada, enJuego }: { players: PlayerWithProbability[]; jornada: number; enJuego: boolean }) {
  const { total, conDato, de } = puntosDelOnce(players, jornada);
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-white/[.06] px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wider text-white/45">
          Jornada {jornada}{enJuego ? " · en juego" : ""}
        </span>
        <span className="block text-[11px] text-white/45">
          {conDato === 0
            ? "Todavía no hay puntos publicados"
            : `${conDato} de ${de} jugadores con puntuación`}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-2xl font-bold leading-none tabular-nums text-white">
          {conDato === 0 ? UNKNOWN : total}
        </span>
        <span className="block text-[10px] text-white/45">puntos</span>
      </span>
    </div>
  );
}
