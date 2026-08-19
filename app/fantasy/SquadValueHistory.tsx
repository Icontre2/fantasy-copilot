"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketValuePoint, Player } from "./types";
import { get } from "./api";
import { millions, signedMillions } from "./format";
import { PlayerImage } from "./PlayerImage";
import { TrendChart } from "./TrendChart";
import { dayMonth, sparklinePoints, trendColor, trendTone } from "./trend";
import {
  aggregateCurrentSquad,
  filterPlayerHistory,
  historyDelta,
  RANGES,
  type HistoryRange,
} from "./squad-history";

type Response = {
  teamId: string;
  from: string;
  histories: Record<string, MarketValuePoint[]>;
  failedPlayerIds: string[];
};

export function SquadValueHistory({
  leagueId,
  teamId,
  players,
  title,
  onPlayer,
}: {
  leagueId: string;
  teamId: string;
  players: Player[];
  title: string;
  onPlayer: (player: Player) => void;
}) {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<HistoryRange>("AUG1");

  useEffect(() => {
    let cancelled = false;
    get<Response>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/teams/${encodeURIComponent(teamId)}/value-history`)
      .then((response) => { if (!cancelled) setData(response); })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "No se pudo cargar la evolución.");
      });
    return () => { cancelled = true; };
  }, [leagueId, teamId]);

  const visibleHistories = useMemo<Record<string, MarketValuePoint[]>>(() => Object.fromEntries(
    Object.entries(data?.histories ?? {}).map(([playerId, points]) => [playerId, filterPlayerHistory(points, range)]),
  ), [data?.histories, range]);
  const total = useMemo(() => aggregateCurrentSquad(visibleHistories), [visibleHistories]);
  const totalDelta = historyDelta(total);
  const movers = players
    .flatMap((player) => {
      const delta = historyDelta(visibleHistories[player.id] ?? []);
      return delta === null ? [] : [{ player, delta }];
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  return (
    <section className="rounded-[26px] glass p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-500">Plantilla completa</p>
          <h3 className="text-lg font-bold text-white">{title} · {players.length}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${trendTone(totalDelta)}`}>
          {totalDelta === null ? "Cargando…" : signedMillions(totalDelta)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1 rounded-xl bg-white/[.04] p-1" aria-label="Periodo de evolución">
        {RANGES.map((option) => (
          <button key={String(option.value)} type="button" onClick={() => setRange(option.value)} aria-pressed={range === option.value} className={`min-h-11 rounded-lg px-2 text-xs font-bold ${range === option.value ? "bg-[#7c3aed] text-white" : "text-neutral-500"}`}>
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>
      ) : total.length > 1 ? (
        <div className="mt-3 rounded-2xl bg-white/[.03] p-3">
          <p className="mb-2 text-[11px] leading-4 text-neutral-500">
            Valor reconstruido de los jugadores que forman esta plantilla hoy.
          </p>
          <TrendChart
            points={total.map((point) => ({ date: point.date, value: point.marketValue }))}
            formatValue={millions}
            formatDate={dayMonth}
            color={trendColor(totalDelta)}
            label={`Evolución de la plantilla actual desde ${dayMonth(total[0]!.date)}. Desliza para ver cada día.`}
          />
          {movers.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Jugadores que más explican el cambio">
              {movers.map(({ player, delta }) => (
                <span key={player.id} className={`rounded-full px-2 py-1 text-[10px] font-bold ${trendTone(delta)}`}>
                  {player.name} {signedMillions(delta)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        /*
          Tres motivos distintos para un mismo hueco, y cada uno se dice: aún no
          ha llegado la respuesta, LALIGA no ha publicado nada, o el periodo
          elegido es tan corto que no llega a dos días. El último solo aparece
          desde que existen «1D» y «3D», y decir «Cargando…» ahí dejaría la
          pantalla mintiendo para siempre.
        */
        <p className="mt-3 grid h-28 place-items-center rounded-2xl border border-dashed border-white/10 px-4 text-center text-xs leading-5 text-neutral-500">
          {data === null
            ? "Cargando históricos oficiales desde el 1 de agosto…"
            : Object.keys(data.histories).length === 0
              ? "LALIGA no ha publicado el histórico de ningún jugador de esta plantilla."
              : "En este periodo no hay dos días con valor de toda la plantilla. Prueba un periodo más largo."}
        </p>
      )}

      {/*
        `data?.` protegía la respuesta que falta entera, pero no una respuesta
        que llega SIN este campo: ahí `undefined.length` reventaba y se llevaba
        por delante la pantalla de Plantilla completa. Se comprueba que sea una
        lista, que es lo único de lo que depende esta frase.
      */}
      {Array.isArray(data?.failedPlayerIds) && data.failedPlayerIds.length > 0 ? (
        <p className="mt-2 text-[10px] leading-4 text-amber-300">
          LALIGA no devolvió el histórico de {data.failedPlayerIds.length} jugador(es); no se rellenan con cero.
        </p>
      ) : null}
      <p className="mt-2 text-[10px] leading-4 text-neutral-600">
        La curva total suma la plantilla actual hacia atrás; una compra o venta pasada cambia quién estaba realmente en el equipo. Cada mini-gráfica sí es el histórico oficial del jugador.
      </p>

      <ul className="mt-3 space-y-2">
        {players.map((player) => {
          const points = visibleHistories[player.id] ?? [];
          const delta = historyDelta(points);
          return (
            <li key={player.id}>
              <button type="button" onClick={() => onPlayer(player)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_5.5rem] items-center gap-2.5 rounded-2xl bg-white/[.035] p-2.5 text-left active:scale-[.99]" aria-label={`Ver histórico completo de ${player.name}`}>
                <PlayerImage player={player} size={42} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{player.name}</span>
                  <span className="block truncate text-[11px] text-neutral-500">{player.position} · {player.team} · {millions(player.marketValue)}</span>
                  <span className={`mt-0.5 block text-[11px] font-bold ${delta === null ? "text-neutral-600" : delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {delta === null ? "Sin histórico" : signedMillions(delta)}
                  </span>
                </span>
                <MiniTrend points={points} delta={delta} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MiniTrend({ points, delta }: { points: MarketValuePoint[]; delta: number | null }) {
  const coords = sparklinePoints(points.map((point) => point.marketValue));
  if (!coords) return <span className="text-center text-[10px] text-neutral-700">—</span>;
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-10 w-full" role="img" aria-label={delta !== null && delta >= 0 ? "Valor en subida" : "Valor en bajada"}>
      <polyline points={coords} fill="none" stroke={trendColor(delta)} strokeWidth="1.7" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
