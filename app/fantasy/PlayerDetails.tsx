"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { get } from "./api";
import { millions, UNKNOWN } from "./format";
import type { MarketValuePoint, Player } from "./types";
import { PlayerImage } from "./PlayerImage";
import { TrendChart } from "./TrendChart";
import { Dificultad } from "./Odds";
import { BottomSheet } from "./BottomSheet";
import { tonoDeDificultad, useDificultad, type DificultadDeEquipo } from "./difficulty";

export function PlayerDetails({ player, onClose }: { player: Player; onClose: () => void }) {
  const [history, setHistory] = useState<MarketValuePoint[]>([]);
  // La ficha abre con toda la temporada. Los filtros cortos son opcionales;
  // nunca se presenta un tramo de 30 dias como si fuese el historial entero.
  const [days, setDays] = useState<7 | 30 | 90 | "MAX">("MAX");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Se comprueba que venga una lista antes de guardarla: una respuesta sin
    // `history` (endpoint caido, cuerpo raro) tumbaba la ficha entera con un
    // "Cannot read properties of undefined". Un histórico que falta es un hueco,
    // no una pantalla rota.
    get<{ history?: MarketValuePoint[] }>(`/api/fantasy/players/${encodeURIComponent(player.id)}/history`)
      .then((data) => {
        if (Array.isArray(data.history)) setHistory(data.history);
        else setError("LALIGA no ha devuelto el histórico de este jugador.");
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "No se pudo cargar el histórico."));
  }, [player.id]);
  const visible = useMemo(() => days === "MAX" ? history : history.slice(-days), [days, history]);
  const dificultad = useDificultad();
  return (
    <BottomSheet onClose={onClose} label={`Ficha de ${player.name}`}>
      <div className="pt-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3"><PlayerImage player={player} size={72} /><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Ficha de jugador</p><h2 className="text-xl font-bold text-white">{player.name}</h2><p className="text-sm text-neutral-500">{player.position} · {player.team}</p></div></div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/8 text-white" aria-label="Cerrar"><X size={18}/></button>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Valor" value={millions(player.marketValue)} /><Stat label="Puntos" value={String(player.points)} /><Stat label="Media" value={String(player.averagePoints)} /><Stat label="Año pasado" value={player.lastSeasonPoints === undefined ? UNKNOWN : String(player.lastSeasonPoints)} />
        </dl>
        <ProximoPartido player={player} dificultad={dificultad} />
        <Forma player={player} />
        <div className="mt-6"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Mercado</p><h3 className="font-bold text-white">Evolución del valor</h3><div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-white/[.04] p-1">{([7, 30, 90, "MAX"] as const).map((option) => <button key={String(option)} type="button" onClick={() => setDays(option)} aria-pressed={days === option} className={`min-h-11 rounded-lg px-2 text-xs font-bold ${days === option ? "bg-[#7c3aed] text-white" : "text-neutral-500"}`}>{option === "MAX" ? "Todo" : `${option}D`}</button>)}</div></div>
        {visible.length > 1 ? <HistoryChart points={visible} marketValue={player.marketValue} /> : <p className="mt-3 glass-soft rounded-2xl p-5 text-center text-sm leading-5 text-neutral-500">{error ?? "Cargando histórico…"}</p>}
      </div>
    </BottomSheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="glass-soft rounded-2xl p-3"><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-white">{value}</dd></div>; }

/**
 * Contra quién juega su equipo esta jornada y a qué precio le ponen el ganar.
 *
 * Sirve para lo que dice y para nada más: saber si el rival es un hueso. NO es
 * una previsión de puntos ni un consejo de alineación — un jugador de un equipo
 * favorito puede quedarse en el banquillo y hacer cero, y eso la cuota no lo
 * sabe.
 *
 * Cuatro situaciones y cada una se dice distinta: no se sabe de qué equipo es,
 * la fuente de cuotas no responde, su partido todavía no está abierto en las
 * casas, o hay cuotas.
 */
function ProximoPartido({
  player,
  dificultad,
}: {
  player: Player;
  dificultad: ReturnType<typeof useDificultad>;
}) {
  // Mientras carga no se dice nada: un hueco que aparece solo es mejor que un
  // «no se sabe» que se desdice a los dos segundos.
  if (!dificultad) return null;

  const suya: DificultadDeEquipo | undefined =
    player.teamId === undefined ? undefined : dificultad.byTeam[player.teamId];

  return (
    <div className="mt-6">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Jornada {dificultad.week}</p>
      <h3 className="font-bold text-white">Su partido</h3>

      {!suya ? (
        <p className="mt-3 glass-soft rounded-2xl p-4 text-center text-sm leading-5 text-neutral-500">
          {player.teamId === undefined
            ? "LALIGA no dice de qué equipo es este jugador, así que no se puede saber contra quién juega."
            : !dificultad.cuotasDisponibles
              ? "Las cuotas no están disponibles ahora mismo: la fuente no ha respondido."
              : "Su partido de esta jornada todavía no está abierto en las casas de apuestas. Aparecerá solo cuando se acerque."}
        </p>
      ) : (
        <div className="mt-3 glass-soft rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-neutral-400">
                {suya.enCasa ? "En casa contra" : "Fuera, contra"}
              </p>
              <p className="truncate text-base font-bold text-white">{suya.rivalName}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{cuando(suya.kickoff)}</p>
            </div>
            <span
              className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center text-xs font-bold ${tonoDeDificultad(suya.probabilidadGanar)}`}
            >
              {suya.etiqueta}
              <span className="mt-0.5 block text-[10px] font-semibold tabular-nums opacity-80">
                ≈ {Math.round(suya.probabilidadGanar * 100)} % gana
              </span>
            </span>
          </div>

          {/* Su equipo resaltado, aunque sea el que menos papeletas tiene. */}
          <Dificultad odds={suya} jugado={suya.jugado} resalta={suya.enCasa ? "local" : "visitante"} />

          <p className="mt-2 text-[11px] leading-4 text-neutral-500">
            Es el precio de una casa de apuestas, no un pronóstico de esta app, y dice lo difícil que
            tiene su equipo el partido — <strong>no</strong> cuántos puntos va a hacer él.
          </p>
        </div>
      )}
    </div>
  );
}

/** «sáb 22, 21:00». Día y hora, en la zona del dispositivo. */
function cuando(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Cuántas jornadas se enseñan en la racha. */
const JORNADAS_DE_FORMA = 6;

/**
 * Estado de forma: lo que ha puntuado en las últimas jornadas.
 *
 * Son los puntos que publica LALIGA jornada a jornada, sin media móvil ni
 * índice inventado. El color acompaña siempre al número, nunca lo sustituye.
 *
 * Mientras no se haya cerrado ninguna jornada, LALIGA devuelve la lista vacía y
 * aquí se dice justo eso. No se rellena con ceros, que se leerían como "jugó y
 * no puntuó" cuando lo cierto es que todavía no ha jugado.
 */
function Forma({ player }: { player: Player }) {
  const jornadas = player.weekPoints ?? [];
  const ultimas = jornadas.slice(-JORNADAS_DE_FORMA);

  return (
    <div className="mt-6">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">Rendimiento</p>
      <h3 className="font-bold text-white">Estado de forma</h3>
      {ultimas.length === 0 ? (
        <p className="mt-3 glass-soft rounded-2xl p-4 text-center text-sm leading-5 text-neutral-500">
          Todavía no hay ninguna jornada cerrada esta temporada, así que LALIGA no publica puntos por
          jornada de nadie. Aparecerá aquí en cuanto los haya.
        </p>
      ) : (
        <>
          <ul className="mt-3 flex gap-1.5">
            {ultimas.map((entrada) => (
              <li key={entrada.jornada} className={`flex-1 rounded-xl px-1 py-2 text-center ${tonoDePuntos(entrada.puntos)}`}>
                <span className="block text-[9px] opacity-70">J{entrada.jornada}</span>
                <span className="block text-sm font-black tabular-nums">{entrada.puntos}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-4 text-neutral-500">
            Puntos por jornada publicados por LALIGA. {ultimas.length} de {jornadas.length} jornadas
            jugadas; la media de esta temporada es {player.averagePoints}.
          </p>
        </>
      )}
    </div>
  );
}

/** Verde, ámbar o rojo según el rango habitual de puntos de una jornada. */
function tonoDePuntos(puntos: number): string {
  if (puntos >= 8) return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  if (puntos >= 4) return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
  if (puntos >= 0) return "bg-white/[.06] text-neutral-300";
  return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
}

/**
 * Evolucion del valor, con las DOS fechas y un aviso si la serie esta vieja.
 *
 * Se rotulan siempre la primera y la ultima fecha. La fuente normal es el host
 * de la temporada en curso; el aviso sigue siendo una defensa por si LALIGA
 * devuelve una serie congelada o vuelve a servir la campaña anterior.
 *
 * No se corrige el numero ni se oculta la curva: se dice de cuando es cada cosa.
 */
function HistoryChart({ points, marketValue }: { points: MarketValuePoint[]; marketValue: number }) {
  const ultimo = points.at(-1)!;
  // El reloj no se lee en el render: es impuro y el linter de React lo rechaza.
  const [ahora] = useState(() => Date.now());
  const vieja = (ahora - Date.parse(ultimo.date)) / 86_400_000 > MAX_DIAS_FRESCA;
  return <div className="mt-3 glass-soft rounded-2xl p-4">
    <TrendChart
      points={points.map((point) => ({ date: point.date, value: point.marketValue }))}
      formatValue={millions}
      formatDate={fecha}
      color={vieja ? "#a1a1aa" : "#8b5cf6"}
      label={`Evolución del valor de mercado, ${points.length} días. Desliza para ver cada día.`}
    />
    <div className="mt-1 text-xs text-neutral-500">{fecha(points[0]!.date)}</div>
    {vieja && (
      <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] leading-4 text-amber-300">
        Esta curva es de la <strong>temporada pasada</strong>: LALIGA dejó de publicar cotización el{" "}
        {fecha(ultimo.date)} y todavía no ha empezado la de esta. Por eso acaba en{" "}
        {millions(ultimo.marketValue)} y arriba pone {millions(marketValue)}, que sí es el valor de hoy.
      </p>
    )}
  </div>;
}

/** Días que puede tener el último dato antes de considerarlo de otra temporada. */
const MAX_DIAS_FRESCA = 7;

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}
