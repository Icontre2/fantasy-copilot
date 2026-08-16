"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { get } from "./api";
import { DataNotes, Empty, ErrorBox, Spinner } from "./ui";
import { UNKNOWN } from "./format";

type Equipo = { id: string; name: string; shortName: string; badge: string } | null;

export type CalendarResponse = {
  week: number;
  currentWeek: number;
  isLive: boolean;
  firstWeek: number;
  lastWeek: number;
  matches: Array<{
    id: string;
    kickoff: string;
    local: Equipo;
    visitor: Equipo;
    localScore: number | null;
    visitorScore: number | null;
  }>;
  dataNotes: string[];
};

/**
 * Horarios de la jornada.
 *
 * Trae su propia carga en vez de pasar por `SectionData` porque cambiar de
 * jornada NO es cambiar de sección: hay que poder ir y venir entre la 3 y la 4
 * sin remontar la pantalla entera ni perder dónde estabas.
 */
export function CalendarView() {
  // La jornada vive aquí y el contenido se remonta con ella (`key`). Así los
  // estados de carga arrancan limpios sin tener que resetearlos dentro de un
  // efecto, que es lo que encadena renders. Mismo patrón que `SectionData`.
  const [week, setWeek] = useState<number | null>(null);
  return <SemanaCargada key={week ?? "actual"} week={week} onWeek={setWeek} />;
}

function SemanaCargada({
  week,
  onWeek,
}: {
  week: number | null;
  onWeek: (week: number) => void;
}) {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    get<CalendarResponse>(`/api/fantasy/calendar${week === null ? "" : `?week=${week}`}`)
      .then((respuesta) => {
        if (!cancelado) setData(respuesta);
      })
      .catch((caught: unknown) => {
        if (!cancelado) setError(caught instanceof Error ? caught.message : "No se pudo cargar el calendario.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => { cancelado = true; };
  }, [week]);

  if (cargando) return <Spinner label="Cargando el calendario…" />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const setWeek = onWeek;
  const puedeAtras = data.week > data.firstWeek;
  const puedeAlante = data.week < data.lastWeek;

  return (
    <div className="space-y-4">
      <section className="glass-strong overflow-hidden rounded-[28px] p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Calendario</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">Jornada {data.week}</h2>
        <p className="mt-2 text-sm leading-5 text-white/55">
          {data.week === data.currentWeek
            ? data.isLive
              ? "Es la jornada en curso y hay partidos en juego."
              : "Es la jornada en curso."
            : data.week < data.currentWeek
              ? "Jornada ya disputada."
              : "Jornada por jugar."}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={!puedeAtras || cargando}
            onClick={() => setWeek(data.week - 1)}
            aria-label="Jornada anterior"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.06] text-white disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>

          <label className="min-w-0 flex-1">
            <span className="sr-only">Elegir jornada</span>
            <select
              value={data.week}
              onChange={(event) => setWeek(Number(event.target.value))}
              className="min-h-11 w-full rounded-2xl border border-white/10 bg-[#121214] px-3 text-center text-sm font-bold text-white"
            >
              {Array.from({ length: data.lastWeek - data.firstWeek + 1 }, (_, index) => data.firstWeek + index).map((numero) => (
                <option key={numero} value={numero}>
                  Jornada {numero}{numero === data.currentWeek ? " · en curso" : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={!puedeAlante || cargando}
            onClick={() => setWeek(data.week + 1)}
            aria-label="Jornada siguiente"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.06] text-white disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {data.matches.length === 0 ? (
        <Empty>LALIGA no ha publicado todavía los partidos de esta jornada.</Empty>
      ) : (
        agruparPorDia(data.matches).map(([dia, partidos]) => (
          <section key={dia} className="glass rounded-[26px] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-neutral-400">{dia}</h3>
            <ul className="space-y-2">
              {partidos.map((partido) => <Partido key={partido.id} partido={partido} />)}
            </ul>
          </section>
        ))
      )}

      <DataNotes notes={data.dataNotes} />
    </div>
  );
}

/** Un partido por fila: hora a la izquierda, escudos y marcador si lo hay. */
function Partido({ partido }: { partido: CalendarResponse["matches"][number] }) {
  const jugado = partido.localScore !== null && partido.visitorScore !== null;
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/[.03] p-2.5">
      <span className="w-12 shrink-0 text-center">
        <span className="block text-sm font-bold tabular-nums text-white">{hora(partido.kickoff)}</span>
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <Escudo equipo={partido.local} />
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-200">{partido.local?.shortName ?? UNKNOWN}</span>
        {/* Marcador solo si LALIGA lo publica; si no, un guion y no un 0-0. */}
        <span className={`shrink-0 rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums ${jugado ? "bg-white/10 text-white" : "text-neutral-600"}`}>
          {jugado ? `${partido.localScore}-${partido.visitorScore}` : "–"}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-sm text-neutral-200">{partido.visitor?.shortName ?? UNKNOWN}</span>
        <Escudo equipo={partido.visitor} />
      </span>
    </li>
  );
}

function Escudo({ equipo }: { equipo: Equipo }) {
  if (!equipo?.badge) return <span className="h-7 w-7 shrink-0 rounded-full bg-white/[.06]" aria-hidden />;
  return <Image src={equipo.badge} alt={equipo.name} width={28} height={28} unoptimized className="h-7 w-7 shrink-0 object-contain" />;
}

/** Los partidos de una jornada caen en varios días: se agrupan por el suyo. */
function agruparPorDia(matches: CalendarResponse["matches"]) {
  const grupos = new Map<string, CalendarResponse["matches"]>();
  for (const partido of matches) {
    const dia = new Date(partido.kickoff).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const lista = grupos.get(dia) ?? [];
    lista.push(partido);
    grupos.set(dia, lista);
  }
  return [...grupos.entries()];
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
