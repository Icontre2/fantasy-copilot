"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { get } from "./api";
import { percent, signedMillions } from "./format";
import { trendTone } from "./trend";
import { variacion } from "./variacion";
import type { MarketValuePoint, Player } from "./types";
import type { DesgloseJugador, FilaMetrica } from "@/src/server/laliga/player-breakdown";
import type { Rentabilidad } from "@/src/server/laliga/value-ratio";
import type { PartidoDeEquipo } from "@/src/server/laliga/calendar";

type BreakdownResponse = { desglose?: DesgloseJugador; rentabilidad?: Rentabilidad | null };

const ROTULO = "text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500";
const HUECO = "mt-3 glass-soft rounded-2xl p-4 text-center text-sm leading-5 text-neutral-500";

/** «+3», «−2», «0». El signo siempre visible: es lo que se lee primero. */
function conSigno(puntos: number): string {
  if (puntos > 0) return `+${puntos}`;
  if (puntos < 0) return `−${Math.abs(puntos)}`;
  return "0";
}

function tonoPuntos(puntos: number): string {
  if (puntos > 0) return "text-emerald-300";
  if (puntos < 0) return "text-rose-300";
  return "text-neutral-500";
}

function decimal(valor: number, digitos = 1): string {
  return valor.toFixed(digitos).replace(".", ",");
}

/**
 * Cuánto ha cambiado su valor en 7 y 30 días. Va encima de la curva, que dice lo
 * mismo pero hay que interpretarla: aquí es el número.
 */
export function VariacionValor({ history }: { history: MarketValuePoint[] }) {
  const tramos = [
    { dias: 7, dato: variacion(history, 7) },
    { dias: 30, dato: variacion(history, 30) },
  ];
  if (tramos.every((tramo) => tramo.dato === null)) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {tramos.map(({ dias, dato }) => (
        <div key={dias} className={`rounded-xl px-3 py-2 ${trendTone(dato?.euros)}`}>
          <p className="text-[11px] opacity-75">Últimos {dias} días</p>
          {dato ? (
            <p className="mt-0.5 text-sm font-bold tabular-nums">
              {signedMillions(dato.euros)}{" "}
              <span className="font-semibold opacity-80">({dato.porcentaje > 0 ? "+" : ""}{percent(dato.porcentaje)})</span>
            </p>
          ) : (
            <p className="mt-0.5 text-sm font-semibold">Sin {dias} días de historia</p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * De dónde salen sus puntos. Todo es dato oficial de LALIGA salvo dos cosas,
 * rotuladas en la propia tarjeta: el reparto por tipo de acción y los puntos por
 * millón.
 */
export function DesglosePuntos({ player }: { player: Player }) {
  const [data, setData] = useState<BreakdownResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jornada, setJornada] = useState<number | null>(null);
  const [todas, setTodas] = useState(false);

  useEffect(() => {
    let cancelado = false;
    get<BreakdownResponse>(`/api/fantasy/players/${encodeURIComponent(player.id)}/breakdown`)
      .then((respuesta) => {
        if (cancelado) return;
        if (respuesta.desglose) setData(respuesta);
        else setError("LALIGA no ha devuelto el desglose de este jugador.");
      })
      .catch((caught: unknown) => {
        if (!cancelado) setError(caught instanceof Error ? caught.message : "No se pudo cargar el desglose.");
      });
    return () => { cancelado = true; };
  }, [player.id]);

  const cabecera = (
    <>
      <p className={ROTULO}>Rendimiento</p>
      <h3 className="font-bold text-white">De dónde salen sus puntos</h3>
    </>
  );

  if (!data?.desglose) {
    return <div className="mt-6">{cabecera}<p className={HUECO}>{error ?? "Cargando desglose…"}</p></div>;
  }

  const { desglose, rentabilidad } = data;
  if (desglose.jornadas.length === 0) {
    return (
      <div className="mt-6">
        {cabecera}
        <p className={HUECO}>Todavía no tiene ninguna jornada puntuada esta temporada, así que no hay nada que desglosar.</p>
      </div>
    );
  }

  const elegida = desglose.jornadas.find((j) => j.jornada === jornada) ?? desglose.jornadas[0]!;
  const filasTemporada = todas ? desglose.temporada : desglose.temporada.slice(0, 6);

  return (
    <div className="mt-6">
      {cabecera}

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Dato etiqueta="Once ideal" valor={`${desglose.vecesEnOnceIdeal} ${desglose.vecesEnOnceIdeal === 1 ? "vez" : "veces"}`} />
        <Dato etiqueta="Valoración Marca" valor={conSigno(desglose.puntosMarca)} />
        <Dato etiqueta="Jugó" valor={`${desglose.jornadasConMinutos} de ${desglose.jornadas.length}`} />
      </dl>

      {desglose.peso && <Peso peso={desglose.peso} />}
      {rentabilidad && <RentabilidadTarjeta r={rentabilidad} posicion={player.position} />}

      <div className="mt-4 glass-soft rounded-2xl p-4">
        <p className="text-sm font-semibold text-white">Toda la temporada</p>
        <Tabla filas={filasTemporada} />
        {desglose.temporada.length > 6 && (
          <button type="button" onClick={() => setTodas(!todas)} className="mt-2 min-h-11 w-full rounded-xl bg-white/[.05] text-xs font-bold text-neutral-300">
            {todas ? "Ver menos" : `Ver las ${desglose.temporada.length} métricas`}
          </button>
        )}
      </div>

      <div className="mt-3 glass-soft rounded-2xl p-4">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Jornada">
          {desglose.jornadas.map((j) => (
            <button
              key={j.jornada}
              type="button"
              aria-pressed={j.jornada === elegida.jornada}
              onClick={() => setJornada(j.jornada)}
              className={`min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold tabular-nums ${j.jornada === elegida.jornada ? "bg-[#7c3aed] text-white" : "bg-white/[.05] text-neutral-400"}`}
            >
              J{j.jornada} · {conSigno(j.total)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-white">Jornada {elegida.jornada}</p>
          <p className={`text-lg font-black tabular-nums ${tonoPuntos(elegida.total)}`}>{conSigno(elegida.total)} pts</p>
        </div>
        {elegida.enOnceIdeal && (
          <p className="mt-1 inline-block rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-200 ring-1 ring-amber-400/30">En el once ideal de la jornada</p>
        )}
        {elegida.metricas.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No participó: ninguna métrica se movió.</p>
        ) : (
          <Tabla filas={elegida.metricas} />
        )}
        {elegida.sinDesglosar !== 0 && (
          <p className="mt-2 text-[11px] leading-4 text-amber-300">
            {conSigno(elegida.sinDesglosar)} puntos de esta jornada no aparecen en el desglose de LALIGA.
          </p>
        )}
      </div>

      <p className="mt-2 text-[11px] leading-4 text-neutral-500">
        Cada fila es lo que hizo y lo que le dio, tal cual lo publica LALIGA. La suma de las filas da los puntos de la jornada.
      </p>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="glass-soft rounded-2xl p-3">
      <dt className="text-[11px] text-neutral-500">{etiqueta}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-white">{valor}</dd>
    </div>
  );
}

function Tabla({ filas }: { filas: FilaMetrica[] }) {
  return (
    <ul className="mt-2 divide-y divide-white/[.06]">
      {filas.map((fila) => (
        <li key={fila.clave} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="min-w-0 truncate text-neutral-300">{fila.etiqueta}</span>
          <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
            <span className="text-xs text-neutral-500">{fila.valor}</span>
            <span className={`w-10 text-right font-bold ${tonoPuntos(fila.puntos)}`}>{conSigno(fila.puntos)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const TRAMOS = [
  { clave: "decisiva", etiqueta: "Goles, asistencias y penaltis", color: "bg-[#8b5cf6]" },
  { clave: "juego", etiqueta: "Minutos y trabajo", color: "bg-emerald-400" },
  { clave: "valoracion", etiqueta: "Valoración de Marca", color: "bg-amber-400" },
] as const;

/** Barra apilada del reparto de sus puntos positivos. Cálculo nuestro. */
function Peso({ peso }: { peso: NonNullable<DesgloseJugador["peso"]> }) {
  return (
    <div className="mt-3 glass-soft rounded-2xl p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-white">Cómo suma</p>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Cálculo nuestro</span>
      </div>
      <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {TRAMOS.map((tramo) => peso[tramo.clave] > 0 && (
          <span key={tramo.clave} className={tramo.color} style={{ width: `${peso[tramo.clave] * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5 text-xs">
        {TRAMOS.map((tramo) => (
          <li key={tramo.clave} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-neutral-400"><span className={`h-2.5 w-2.5 rounded-full ${tramo.color}`} />{tramo.etiqueta}</span>
            <span className="font-bold tabular-nums text-white">{percent(peso[tramo.clave], 0)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-4 text-neutral-500">
        Reparto de los puntos que ha sumado (sin restar tarjetas ni pérdidas). Mucho morado significa que depende de marcar o asistir; mucho verde, que suma jugando aunque no marque.
      </p>
    </div>
  );
}

const NOMBRE_POSICION: Record<string, string> = { POR: "porteros", DEF: "defensas", MED: "centrocampistas", DEL: "delanteros" };

function RentabilidadTarjeta({ r, posicion }: { r: Rentabilidad; posicion: string }) {
  return (
    <div className="mt-3 glass-soft rounded-2xl p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-white">Puntos por millón</p>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Cálculo nuestro</span>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">
        {decimal(r.puntosPorMillon, 2)} <span className="text-sm font-semibold text-neutral-500">pts / M€</span>
      </p>
      <p className="mt-1 text-xs text-neutral-400">
        Puesto {r.puesto} de {r.de} {NOMBRE_POSICION[posicion] ?? "jugadores de su posición"}.
      </p>
      <p className="mt-2 text-[11px] leading-4 text-neutral-500">
        Puntos de la temporada divididos por su valor de hoy. No es un consejo: un jugador barato con pocos minutos puede salir alto por casualidad.
      </p>
    </div>
  );
}

/** «sáb 18, 21:00», en la hora del dispositivo. */
function cuando(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function resultado(p: PartidoDeEquipo): { texto: string; tono: string } | null {
  if (p.golesPropios === null || p.golesRival === null) return null;
  const marcador = `${p.golesPropios}-${p.golesRival}`;
  if (p.golesPropios > p.golesRival) return { texto: `Ganó ${marcador}`, tono: "text-emerald-300" };
  if (p.golesPropios < p.golesRival) return { texto: `Perdió ${marcador}`, tono: "text-rose-300" };
  return { texto: `Empate ${marcador}`, tono: "text-neutral-300" };
}

/** Sus partidos desde la jornada en curso. Calendario oficial, sin valoraciones. */
export function ProximosPartidos({ player }: { player: Player }) {
  const [partidos, setPartidos] = useState<PartidoDeEquipo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!player.teamId) return;
    let cancelado = false;
    get<{ partidos?: PartidoDeEquipo[] }>(`/api/fantasy/teams/${encodeURIComponent(player.teamId)}/fixtures`)
      .then((r) => { if (!cancelado) setPartidos(Array.isArray(r.partidos) ? r.partidos : []); })
      .catch((caught: unknown) => { if (!cancelado) setError(caught instanceof Error ? caught.message : "No se pudo cargar el calendario."); });
    return () => { cancelado = true; };
  }, [player.teamId]);

  const cabecera = (
    <>
      <p className={ROTULO}>Calendario</p>
      <h3 className="font-bold text-white">Sus próximos partidos</h3>
    </>
  );

  if (!player.teamId) {
    return <div className="mt-6">{cabecera}<p className={HUECO}>LALIGA no dice de qué equipo es este jugador, así que no se puede saber su calendario.</p></div>;
  }
  if (!partidos) return <div className="mt-6">{cabecera}<p className={HUECO}>{error ?? "Cargando calendario…"}</p></div>;
  if (partidos.length === 0) return <div className="mt-6">{cabecera}<p className={HUECO}>No quedan partidos publicados para su equipo.</p></div>;

  return (
    <div className="mt-6">
      {cabecera}
      <ul className="mt-3 glass-soft divide-y divide-white/[.06] rounded-2xl px-4">
        {partidos.map((p) => {
          const final = resultado(p);
          return (
            <li key={p.jornada} className="flex items-center gap-3 py-3">
              <span className="w-8 shrink-0 text-xs font-bold tabular-nums text-neutral-500">J{p.jornada}</span>
              {p.rival?.badge
                ? <Image src={p.rival.badge} alt="" width={28} height={28} unoptimized className="h-7 w-7 shrink-0 object-contain" />
                : <span className="h-7 w-7 shrink-0 rounded-full bg-white/[.06]" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{p.enCasa ? "vs" : "en"} {p.rival?.name ?? "rival desconocido"}</p>
                <p className="text-xs text-neutral-500">{p.enCasa ? "En casa" : "Fuera"} · {cuando(p.kickoff)}</p>
              </div>
              {final && <span className={`shrink-0 text-xs font-bold tabular-nums ${final.tono}`}>{final.texto}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
