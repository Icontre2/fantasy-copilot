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
    odds: Cuotas | null;
  }>;
  /** `false` = la fuente de cuotas no respondió. */
  cuotasDisponibles: boolean;
  /** Si alguno de los partidos de ESTA jornada trae cuotas. */
  cuotasEnEstaJornada: boolean;
  dataNotes: string[];
};

type Cuotas = {
  cuotas: { local: number; empate: number; visitante: number };
  probabilidades: { local: number; empate: number; visitante: number; margen: number };
  /** Quién publica la cuota: una casa concreta o «media del mercado». */
  casa: string;
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

      {/*
        Tres situaciones distintas y se dicen distinto: la fuente no responde,
        responde pero esta jornada aún no está abierta en las casas, o hay
        cuotas y no hace falta decir nada.
      */}
      {!data.cuotasDisponibles ? (
        <p className="rounded-2xl border border-white/8 bg-white/[.03] px-4 py-3 text-xs leading-5 text-neutral-500">
          Las cuotas no están disponibles ahora mismo: la fuente no ha respondido. Los horarios y
          resultados de arriba no dependen de ella.
        </p>
      ) : !data.cuotasEnEstaJornada ? (
        <p className="rounded-2xl border border-white/8 bg-white/[.03] px-4 py-3 text-xs leading-5 text-neutral-500">
          Todavía no hay cuotas de esta jornada. Las casas abren sus mercados unos días antes, así
          que aparecen solas cuando se acerca.
        </p>
      ) : null}

      <DataNotes notes={data.dataNotes} />
    </div>
  );
}

/**
 * Qué de difícil lo tiene cada equipo, según la casa de apuestas.
 *
 * Se enseñan las tres cuotas tal cual las publica, y debajo el porcentaje ya sin
 * su comisión — que es cálculo nuestro y por eso lleva el «≈». La palabra
 * («Muy favorable», «Igualado»…) acompaña siempre al número: el color solo no
 * explica nada.
 *
 * Esto NO dice quién va a ganar. Es el precio al que una casa paga cada
 * resultado, que es una cosa distinta y bastante más honesta.
 *
 * Si el partido ya se jugó lo dice («cuotas previas»). La fuente tarda un par de
 * días en soltar los partidos disputados, así que aparecen cuotas junto a un
 * marcador ya cerrado — y sin avisar parecería que la app no se ha enterado del
 * resultado.
 */
function Dificultad({ odds, jugado }: { odds: Cuotas; jugado: boolean }) {
  const { probabilidades: p, cuotas } = odds;
  const favorito = p.local >= p.visitante ? "local" : "visitante";
  return (
    <div className="mt-2 rounded-xl bg-white/[.03] px-2.5 py-2">
      <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
        <Cuota etiqueta="1" cuota={cuotas.local} probabilidad={p.local} destacado={favorito === "local"} />
        <Cuota etiqueta="X" cuota={cuotas.empate} probabilidad={p.empate} destacado={false} />
        <Cuota etiqueta="2" cuota={cuotas.visitante} probabilidad={p.visitante} destacado={favorito === "visitante"} />
      </div>
      <p className="mt-1.5 text-center text-[10px] leading-3 text-neutral-600">
        Cuotas {jugado ? "previas al partido, de" : "de"} {odds.casa}. El % es la probabilidad implícita sin su comisión
        {odds.probabilidades.margen > 1 ? ` (${Math.round((odds.probabilidades.margen - 1) * 100)} %)` : ""}.
      </p>
    </div>
  );
}

function Cuota({
  etiqueta,
  cuota,
  probabilidad,
  destacado,
}: {
  etiqueta: string;
  cuota: number;
  probabilidad: number;
  destacado: boolean;
}) {
  return (
    <span className={`rounded-lg px-1 py-1 ${destacado ? "bg-[#7c3aed]/20 ring-1 ring-[#7c3aed]/40" : "bg-white/[.04]"}`}>
      <span className="block text-[9px] text-neutral-500">{etiqueta}</span>
      <span className="block font-bold tabular-nums text-white">{cuota.toFixed(2).replace(".", ",")}</span>
      <span className="block text-[10px] tabular-nums text-neutral-400">≈ {Math.round(probabilidad * 100)} %</span>
    </span>
  );
}

/** Un partido por fila: hora a la izquierda, escudos y marcador si lo hay. */
function Partido({ partido }: { partido: CalendarResponse["matches"][number] }) {
  const jugado = partido.localScore !== null && partido.visitorScore !== null;
  return (
    <li className="rounded-2xl bg-white/[.03] p-2.5">
    <div className="flex items-center gap-3">
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
    </div>
    {/* Las cuotas solo si las hay para ESTE partido: los de dentro de meses
        todavía no están abiertos en ninguna casa. */}
    {partido.odds && <Dificultad odds={partido.odds} jugado={jugado} />}
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
