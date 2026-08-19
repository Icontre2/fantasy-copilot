"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, ChevronRight, Coins, Trophy, Users } from "lucide-react";
import Image from "next/image";
import type { DashboardResponse, MarketValuePoint } from "./types";
import { get } from "./api";
import { millions } from "./format";
import { ManagerSheet } from "./ManagerSheet";
import { TrendChart } from "./TrendChart";
import { dayMonth, trendColor } from "./trend";
import {
  aggregateCurrentSquad,
  filterPlayerHistory,
  historyDelta,
  RANGES,
  type HistoryRange,
} from "./squad-history";
import { ErrorBox } from "./ui";

type ValueHistoryResponse = {
  teamId: string;
  from: string;
  histories: Record<string, MarketValuePoint[]>;
  failedPlayerIds: string[];
};

/**
 * Los rivales, siempre como lista.
 *
 * Si la respuesta llega sin `competitors` —endpoint caido, cuerpo raro— el
 * `map` de mas abajo reventaba con "is not iterable" y se llevaba por delante
 * la pantalla entera: ni tu valor, ni tu caja, ni nada. Tu resumen no depende
 * de que se hayan podido leer los rivales, asi que no debe caerse con ellos.
 */
function rivalesDe(data: DashboardResponse) {
  return Array.isArray(data.competitors) ? data.competitors : [];
}

export function DashboardView({ data }: { data: DashboardResponse }) {
  const [range, setRange] = useState<HistoryRange>("AUG1");
  const [abierto, setAbierto] = useState<string | null>(null);
  const competitors = rivalesDe(data);
  // Sin tu equipo no hay resumen que enseñar. Se dice; no se revienta con una
  // pantalla en blanco y un `undefined` por consola.
  const sinEquipo = !data?.me?.teamId;
  const { histories, cargando, error } = useSquadHistory(data.league?.id, data.me?.teamId);

  const total = useMemo(() => {
    const recortado = Object.fromEntries(
      Object.entries(histories).map(([playerId, points]) => [playerId, filterPlayerHistory(points, range)]),
    );
    return aggregateCurrentSquad(recortado);
  }, [histories, range]);
  const delta = historyDelta(total);

  if (sinEquipo) {
    return <ErrorBox message="LALIGA no ha devuelto tu equipo en esta liga. Vuelve a entrar en unos minutos." />;
  }

  const competidorAbierto = competitors.find((competitor) => competitor.teamId === abierto);

  return (
    <div className="space-y-5">
      <section className="glass-strong overflow-hidden rounded-[30px] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#a78bfa]">Valor de tu plantilla</p>
            <p className="mt-2 text-[36px] font-bold leading-none tracking-[-.04em]">{millions(data.me.teamValue)}</p>
            <p className={`mt-2 text-sm ${delta === null ? "text-white/45" : delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {delta === null ? "Sin variación medible en este periodo" : `${delta >= 0 ? "+" : ""}${millions(delta)} en el periodo`}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[.06] px-3 py-2 text-center backdrop-blur">
            <Trophy size={17} className="mx-auto text-[#a78bfa]" />
            <p className="mt-1 text-lg font-bold">#{data.me.position ?? "—"}</p>
            <p className="text-[10px] text-white/55">posición</p>
          </div>
        </div>

        <RangePicker value={range} onChange={setRange} />
        <ValueChart points={total} cargando={cargando} error={error} delta={delta} />

        <div className="mt-4 grid grid-cols-2 gap-2">
          {/* Las mismas dos cifras que en cada rival, para poder compararte de un vistazo. */}
          <Metric icon={<Coins size={16} />} label="Caja" value={millions(data.me.teamMoney)} accent />
          <Metric icon={<Banknote size={16} />} label="Valor equipo" value={millions(data.me.teamValue)} />
        </div>
        <p className="mt-3 text-[10px] leading-4 text-white/45">
          Curva reconstruida con la cotización oficial que LALIGA publica de cada jugador que hoy
          está en tu plantilla. Una compra o una venta pasada cambia quién estaba de verdad en el
          equipo aquel día; el valor de hoy, arriba, sí es el oficial.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-400">Tu liga</p>
            <h2 className="text-xl font-bold tracking-tight text-white">Competidores</h2>
          </div>
          <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-neutral-300">
            <Users size={14} /> {competitors.length + 1}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {competitors.map((competitor) => {
            // Respaldo individual: nunca se le aplica el ajuste de otro manager.
            const estimatedCash = competitor.estimatedCash;
            return (
              <article key={competitor.teamId} className="overflow-hidden rounded-[26px] glass">
                {/*
                  La tarjeta ENTERA es el botón. Antes solo se podía tocar a un
                  rival desde la pantalla de Liga, así que su once y su plantilla
                  estaban a dos pantallas de distancia de donde se le mira.
                */}
                <button
                  type="button"
                  onClick={() => setAbierto(competitor.teamId)}
                  className="w-full p-4 text-left active:scale-[.99]"
                  aria-label={`Ver la ficha de ${competitor.manager.name}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={competitor.manager.name} image={competitor.manager.avatar} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{competitor.manager.name}</p>
                      <p className="text-xs text-neutral-400">#{competitor.position ?? "—"} · {competitor.points ?? "—"} pts</p>
                    </div>
                    <p className="text-sm font-bold text-white">{millions(competitor.teamValue)}</p>
                    <ChevronRight size={16} className="shrink-0 text-neutral-500" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <SmallMetric
                      label={competitor.teamMoney !== undefined ? "Caja" : "Caja aprox."}
                      value={competitor.teamMoney !== undefined ? millions(competitor.teamMoney) : `≈ ${millions(estimatedCash)}`}
                      lime={(competitor.teamMoney ?? estimatedCash) >= 0}
                      nota={competitor.teamMoney === undefined ? "estimada, no valor de equipo" : undefined}
                    />
                    <SmallMetric label="Valor equipo" value={millions(competitor.teamValue)} />
                  </div>
                </button>
              </article>
            );
          })}
        </div>
        {/*
          Dos caminos, y el texto dice por cual se ha ido en ESTA carga.
          Distinguirlos importa: "≈ 8 M" y "8 M" son cosas muy distintas y la
          diferencia no puede quedarse en la cabeza de quien lo programo.

          Si LALIGA acaba publicando la caja ajena —se le pregunta por la liga
          entera y ademas equipo a equipo—, la cifra es oficial y sobra la nota
          de la estimacion. Mientras no la publique, se enseña la aproximacion
          con su metodo escrito aqui debajo, para que se pueda juzgar.
        */}
        {competitors.length > 0 && competitors.every((competitor) => competitor.teamMoney !== undefined) ? (
          <p className="mt-3 text-[11px] leading-4 text-neutral-500">
            Cajas oficiales de LALIGA. En <strong>Economía</strong> tienes el detalle de compras y
            ventas de cada uno.
          </p>
        ) : competitors.some((competitor) => competitor.teamMoney !== undefined) ? (
          <p className="mt-3 text-[11px] leading-4 text-neutral-500">
            Las cifras sin ≈ son cajas oficiales. Donde LALIGA no publica la caja ni equipo a equipo,
            se muestra 100 M + historial completo + puntos de ese manager, sin usar el valor del equipo
            ni trasladarle el ajuste de otra persona.
          </p>
        ) : (
          <p className="mt-3 text-[11px] leading-4 text-neutral-500">
            <strong>Caja aproximada</strong>, no oficial: LALIGA no publica la caja ajena ni en la
            liga entera ni equipo a equipo, así que se calcula con 100 M iniciales + todo el historial
            paginado + puntos de cada manager. Puede ser negativa y no incluye el valor del equipo.
            En <strong>Economía</strong> están sus compras, cláusulas y ventas con importes reales.
          </p>
        )}
      </section>

      {competidorAbierto && (
        // El `key` es lo que hace que abrir otro manager empiece de cero en vez
        // de enseñar un instante la plantilla del anterior.
        <ManagerSheet
          key={competidorAbierto.teamId}
          competitor={competidorAbierto}
          leagueId={data.league.id}
          onClose={() => setAbierto(null)}
        />
      )}
    </div>
  );
}

/**
 * El histórico oficial de tu plantilla.
 *
 * ── Por qué ya no se guarda una foto al día en el dispositivo ────────────────
 * Esta gráfica se alimentaba de `localStorage`: una foto diaria a partir de la
 * primera visita. Eso tenía un defecto que no se arregla ajustando nada, y es
 * el que se ve en pantalla: recién instalada la app hay UN punto, y entonces
 * «7D», «30D» y «Todo» enseñan exactamente lo mismo —nada— durante semanas. El
 * selector de periodo no servía para nada porque no había periodo que elegir.
 *
 * Y no hacía falta: LALIGA sí publica la cotización diaria de cada JUGADOR, y
 * la app ya la descargaba para la pantalla de Plantilla. Sumando la de los
 * jugadores que hoy tienes se obtiene una serie real desde el 1 de agosto, con
 * la que 1D, 3D, 7D y 30D son periodos de verdad desde el primer día.
 *
 * El precio, escrito en pantalla y no escondido aquí: la curva mira hacia atrás
 * con la plantilla de HOY, así que un fichaje de la semana pasada aparece como
 * si siempre hubiera estado. Es lo mismo que ya advertía la pantalla de
 * Plantilla, y sigue siendo preferible a un selector que no selecciona nada.
 */
function useSquadHistory(leagueId: string | undefined, teamId: string | undefined) {
  const [histories, setHistories] = useState<Record<string, MarketValuePoint[]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId || !teamId) return;
    let cancelado = false;
    get<ValueHistoryResponse>(
      `/api/fantasy/leagues/${encodeURIComponent(leagueId)}/teams/${encodeURIComponent(teamId)}/value-history`,
    )
      .then((respuesta) => {
        if (cancelado) return;
        setHistories(respuesta.histories ?? {});
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!cancelado) setError(caught instanceof Error ? caught.message : "No se pudo cargar la evolución.");
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [leagueId, teamId]);

  return { histories, cargando, error };
}

function RangePicker({ value, onChange }: { value: HistoryRange; onChange: (value: HistoryRange) => void }) {
  return (
    <div className="mt-5 grid grid-cols-5 gap-1 rounded-2xl bg-white/[.06] p-1" aria-label="Periodo del histórico">
      {RANGES.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-xl text-xs font-bold transition ${value === option.value ? "bg-[#7c3aed] text-white" : "text-white/55"}`}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ValueChart({
  points,
  cargando,
  error,
  delta,
}: {
  points: MarketValuePoint[];
  cargando: boolean;
  error: string | null;
  delta: number | null;
}) {
  // Un hueco vacío no explica por qué está vacío: los tres motivos posibles
  // —todavía cargando, LALIGA no responde, periodo demasiado corto— se dicen.
  if (points.length < 2) {
    return (
      <div className="mt-3 grid h-28 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 text-center text-xs leading-5 text-white/45">
        <span>
          {error ?? (cargando
            ? "Cargando la cotización oficial de tus jugadores…"
            : "En este periodo no hay dos días con valor de toda la plantilla. Prueba uno más largo.")}
        </span>
      </div>
    );
  }
  return (
    <TrendChart
      className="mt-3"
      points={points.map((point) => ({ date: point.date, value: point.marketValue }))}
      formatValue={millions}
      formatDate={dayMonth}
      color={trendColor(delta)}
      label={`Valor de tu plantilla desde ${dayMonth(points[0]!.date)}, ${points.length} días. Desliza para ver cada día.`}
    />
  );
}

function Metric({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl p-3 ${accent ? "bg-[#7c3aed]/25 ring-1 ring-[#7c3aed]/45" : "glass-soft"}`}><div className="flex items-center gap-2 text-xs text-white/60">{icon}{label}</div><p className={`mt-1 text-lg font-bold tracking-tight ${accent ? "text-[#c4b5fd]" : "text-white"}`}>{value}</p></div>;
}
function SmallMetric({ label, value, lime = false, nota }: { label: string; value: string; lime?: boolean; nota?: string }) {
  return <div className={`rounded-2xl px-3 py-2 ${lime ? "bg-emerald-500/12 ring-1 ring-emerald-500/25" : "glass-soft"}`}><p className="text-neutral-500">{label}</p><p className={`mt-0.5 font-bold ${lime ? "text-emerald-400" : "text-white"}`}>{value}</p>{nota && <p className="mt-0.5 text-[9px] leading-3 text-neutral-600">{nota}</p>}</div>;
}
function Avatar({ name, image }: { name: string; image?: string }) {
  if (image) return <Image src={image} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full bg-neutral-100 object-cover" />;
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#7c3aed]/20 text-sm font-bold text-[#c4b5fd]">{name.slice(0, 1).toUpperCase()}</span>;
}
