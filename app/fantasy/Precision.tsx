"use client";

import { useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";
import { getCacheado, post } from "./api";
import type { Prediccion } from "./PrediccionCard";

/**
 * Cuánto acierta el predictor, jornada a jornada.
 *
 * Guarda sola la predicción del mejor once mientras la jornada no ha empezado
 * (el servidor la congela en cuanto rueda el balón) y enseña, de las jornadas
 * ya terminadas, lo previsto frente a lo que hicieron de verdad esos once.
 */

type Evaluacion = { jornada: number; previsto: number; real: number; error: number };
type Respuesta = { evaluaciones: Evaluacion[]; errorMedio: number | null };

export function Precision({ leagueId, prediccion, listo }: { leagueId: string; prediccion: Prediccion; listo: boolean }) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const guardada = useRef<string | null>(null);
  const { optimo, jornada } = prediccion;

  // Guardar: una vez por jornada y total, y solo con la dificultad ya cargada
  // (sin ella el número no es el mismo que ves) y sin nadie que haya jugado.
  useEffect(() => {
    if (!listo || !optimo || jornada === null || optimo.yaJugaron > 0) return;
    const clave = `${jornada}:${optimo.total}:${optimo.titulares.map((j) => j.player.id).join(",")}`;
    if (guardada.current === clave) return;
    guardada.current = clave;
    post(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/predictions`, {
      jornada,
      formacion: optimo.formacion,
      total: optimo.total,
      jugadores: optimo.titulares.map((j) => ({ id: j.player.id, name: j.player.name, puntos: j.proyeccion?.points ?? 0 })),
    }).catch(() => {
      // Si no se guarda, se reintenta la próxima vez que se abra: no es un
      // error que el usuario tenga que ver ni resolver.
      guardada.current = null;
    });
  }, [listo, optimo, jornada, leagueId]);

  useEffect(() => {
    let cancelado = false;
    getCacheado<Respuesta>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/predictions`)
      .then((r) => { if (!cancelado) setDatos(r); })
      .catch(() => { if (!cancelado) setDatos({ evaluaciones: [], errorMedio: null }); });
    return () => { cancelado = true; };
  }, [leagueId]);

  if (!datos) return null;
  const ultimas = datos.evaluaciones.slice(0, 4);

  return (
    <section className="ll-enter rounded-[24px] border border-white/8 bg-white/[.035] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#7c3aed]/18 text-[#c4b5fd]"><Target size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-400">Precisión del predictor</p>
          <p className="mt-0.5 text-sm font-bold text-white">
            {datos.errorMedio === null
              ? "Aún sin jornadas cerradas"
              : `Se equivoca en ±${fmt(datos.errorMedio)} pts de media`}
          </p>
        </div>
      </div>
      {ultimas.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {ultimas.map((e) => (
            <li key={e.jornada} className="flex items-center justify-between rounded-xl bg-white/[.04] px-3 py-2 text-sm">
              <span className="font-semibold text-white/70">J{e.jornada}</span>
              <span className="tabular-nums text-white/60">previsto {fmt(e.previsto)} · real <strong className="text-white">{fmt(e.real)}</strong></span>
              <span className={`w-14 text-right font-bold tabular-nums ${e.error >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{e.error >= 0 ? "+" : ""}{fmt(e.error)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-4 text-neutral-500">
          Tu predicción se guarda sola antes de cada jornada. Cuando termine verás aquí lo previsto frente a lo que hicieron de verdad esos once.
        </p>
      )}
    </section>
  );
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");
