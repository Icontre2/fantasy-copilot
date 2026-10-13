"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useDificultad } from "./difficulty";
import { millions } from "./format";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";
import { projectPlayerPoints } from "./projection";
import { useSeguidos } from "./seguimiento";
import type { Player, PlayerWithProbability } from "./types";
import { Empty } from "./ui";

/** Los jugadores que sigues (estrella en su ficha), con su estado y su previsión. */
export function SeguimientoView({ data }: { data: { players: Player[] } }) {
  const seguidos = useSeguidos();
  const dificultad = useDificultad();
  const [selected, setSelected] = useState<Player | null>(null);
  const jugadores = useMemo(() => {
    const porId = new Map((Array.isArray(data.players) ? data.players : []).map((p) => [p.id, p]));
    return seguidos.map((id) => porId.get(id)).filter((p): p is Player => p !== undefined);
  }, [data.players, seguidos]);

  return <div className="space-y-4">
    <section className="glass-strong rounded-[28px] p-5 text-white">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Tu lista</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Seguimiento</h2>
      <p className="mt-2 text-sm text-white/55">Toca la estrella en la ficha de cualquier jugador para seguirlo aquí.</p>
    </section>
    {jugadores.length === 0 ? <Empty>Aún no sigues a nadie. Abre la ficha de un jugador y pulsa la estrella.</Empty> :
      <div className="ll-stagger space-y-2">{jugadores.map((p) => {
        const partido = p.teamId && dificultad ? dificultad.byTeam[p.teamId] : undefined;
        const prev = projectPlayerPoints(p as PlayerWithProbability, partido);
        return <button key={p.id} type="button" onClick={() => setSelected(p)} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-[#0d0d10] p-3 text-left">
          <PlayerImage player={p} size={44} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-bold text-white"><Star size={13} className="shrink-0 text-amber-300" fill="currentColor" />{p.name}</p>
            <p className="truncate text-[11px] text-neutral-500">{p.position} · {p.team} · {millions(p.marketValue)} · media {p.averagePoints.toFixed(1).replace(".", ",")}{p.status !== "ok" ? " · baja/duda" : ""}{partido ? ` · ${partido.enCasa ? "vs" : "en"} ${partido.rivalShortName}` : ""}</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#d6ff75]/12 px-2.5 py-1 text-xs font-black tabular-nums text-[#d6ff75]">{prev ? `≈ ${prev.points.toFixed(1).replace(".", ",")}` : "—"}</span>
        </button>;
      })}</div>}
    {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)} /> : null}
  </div>;
}
