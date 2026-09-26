"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { DashboardResponse, Player, PlayerWithProbability } from "./types";
import { Pitch } from "./Pitch";
import { PrediccionResumen, usePrediccion } from "./PrediccionCard";
import { PlayerDetails } from "./PlayerDetails";
import { Precision } from "./Precision";
import { jornadasDisponibles, puntosDelOnce } from "./jornadas";
import { UNKNOWN } from "./format";

/**
 * Plantilla = el predictor de la jornada.
 *
 * Arriba, los puntos ≈ que hará tu mejor once y qué cambiar para llegar a él.
 * Debajo, ese once en el campo con los puntos previstos de cada uno. Solo el
 * once: la plantilla entera no aporta nada a la decisión de a quién alinear.
 * Los puntos reales de jornadas pasadas quedan en la otra pestaña.
 */
type Modo = "PREDICCION" | "JORNADAS";

export function MySquadView({ data }: { data: DashboardResponse }) {
  const [selected, setSelected] = useState<Player | null>(null);
  const [modo, setModo] = useState<Modo>("PREDICCION");
  const prediccion = usePrediccion(data);
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
  const entran = useMemo(() => new Set(prediccion.cambios.map((c) => c.entra.player.id)), [prediccion.cambios]);
  const optimo = prediccion.optimo;

  return (
    <div className="space-y-4">
      <PrediccionResumen prediccion={prediccion} />

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[.05] p-1" role="tablist" aria-label="Qué ver en el campo">
        {([["PREDICCION", "Próxima jornada"], ["JORNADAS", "Jornadas pasadas"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={modo === id} onClick={() => setModo(id)} className={`min-h-11 rounded-xl text-sm font-bold transition-colors duration-200 ${modo === id ? "bg-[#7c3aed] text-white shadow-[0_6px_18px_rgba(124,58,237,.35)]" : "text-white/50"}`}>{label}</button>
        ))}
      </div>

      {modo === "PREDICCION" ? (
        <section key="prediccion" className="ll-enter space-y-3">
          {optimo ? (
            <Pitch
              starters={optimo.titulares.map((j) => j.player)}
              proyecciones={prediccion.proyecciones}
              reales={prediccion.reales}
              destacados={entran}
              onSelect={setSelected}
            />
          ) : (
            <p className="rounded-2xl glass p-6 text-center text-sm text-neutral-400">Tu plantilla no llena ninguna formación válida.</p>
          )}
          <p className="flex gap-2 px-1 text-[11px] leading-4 text-white/45">
            <Info size={14} className="shrink-0" />
            <span>
              El número verde son los puntos previstos: combina la media, la forma reciente, si juega en casa, las cuotas del
              partido y la probabilidad de titular (el %). Lesionados y sancionados cuentan cero. En morado con ✓, los que ya
              jugaron: son sus puntos reales. Con aro, los que entran respecto a tu once más probable. Es una estimación y no
              cambia tu alineación en LALIGA.
            </span>
          </p>
          <Precision leagueId={data.league.id} prediccion={prediccion} listo={prediccion.listo} />
        </section>
      ) : (
        <section key="jornadas" className="ll-enter glass-strong rounded-[28px] p-4 text-white">
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
          <p className="mt-3 text-[11px] leading-4 text-white/45">
            Tu once más probable ({data.lineup.formation}). El número morado son los puntos reales de la jornada elegida.
          </p>
        </section>
      )}

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
