"use client";

import { useMemo, useState } from "react";
import { BarChart3, Search } from "lucide-react";
import { filasDeEstadistica, ordenar, type OrdenEstadistica } from "./estadisticas";
import { millions } from "./format";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";
import type { Player, Position } from "./types";
import { Empty } from "./ui";

/** Rankings de todos los jugadores de LaLiga con datos oficiales de LALIGA Fantasy. */

const ORDENES: Array<{ id: OrdenEstadistica; label: string; ayuda: string }> = [
  { id: "PUNTOS", label: "Puntos", ayuda: "Puntos totales de la temporada." },
  { id: "MEDIA", label: "Media", ayuda: "Puntos por jornada jugada." },
  { id: "FORMA", label: "Forma", ayuda: "Media de las 3 últimas jornadas." },
  { id: "RENTABILIDAD", label: "Pts/M€", ayuda: "Puntos de la temporada por cada millón que vale." },
  { id: "VALOR", label: "Valor", ayuda: "Valor de mercado actual." },
];
const POSICIONES: Array<"TODAS" | Position> = ["TODAS", "POR", "DEF", "MED", "DEL"];

export function EstadisticasView({ data }: { data: { players: Player[] } }) {
  const [orden, setOrden] = useState<OrdenEstadistica>("PUNTOS");
  const [posicion, setPosicion] = useState<"TODAS" | Position>("TODAS");
  const [equipo, setEquipo] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [limite, setLimite] = useState(50);
  const [selected, setSelected] = useState<Player | null>(null);
  const players = useMemo(() => (Array.isArray(data.players) ? data.players : []), [data.players]);
  const filas = useMemo(() => filasDeEstadistica(players), [players]);
  const equipos = useMemo(() => [...new Set(players.map((p) => p.team))].filter((t) => t && t !== "—").sort(), [players]);
  const visibles = useMemo(() => ordenar(filas, { orden, posicion, equipo, busqueda }), [filas, orden, posicion, equipo, busqueda]);
  const ayuda = ORDENES.find((o) => o.id === orden)?.ayuda ?? "";

  const valor = (f: (typeof visibles)[number]) =>
    orden === "PUNTOS" ? String(f.player.points)
      : orden === "MEDIA" ? f.player.averagePoints.toFixed(1).replace(".", ",")
      : orden === "FORMA" ? (f.forma === null ? "—" : f.forma.toFixed(1).replace(".", ","))
      : orden === "RENTABILIDAD" ? (f.puntosPorMillon === null ? "—" : f.puntosPorMillon.toFixed(1).replace(".", ","))
      : millions(f.player.marketValue);

  return <div className="space-y-4">
    <section className="glass-strong overflow-hidden rounded-[28px] p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Todos los jugadores</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Estadísticas</h2><p className="mt-2 text-sm text-white/55">{players.length} jugadores de LaLiga, con datos oficiales.</p></div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#7c3aed] text-white"><BarChart3 size={22} /></span>
      </div>
    </section>
    <div className="grid grid-cols-5 gap-1.5">{ORDENES.map((o) => <button key={o.id} type="button" onClick={() => setOrden(o.id)} aria-pressed={orden === o.id} className={`min-h-11 rounded-xl px-1 text-[11px] font-bold ${orden === o.id ? "bg-[#7c3aed] text-white" : "glass text-neutral-500"}`}>{o.label}</button>)}</div>
    <p className="px-1 text-[11px] text-neutral-500">{ayuda}</p>
    <label className="flex min-h-12 items-center gap-2 rounded-2xl glass px-4 text-neutral-500"><Search size={18} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar jugador o equipo…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-600" /></label>
    <div className="grid grid-cols-5 gap-1.5">{POSICIONES.map((p) => <button key={p} type="button" onClick={() => setPosicion(p)} aria-pressed={posicion === p} className={`min-h-11 rounded-xl text-[11px] font-bold ${posicion === p ? "bg-white/15 text-white ring-1 ring-white/20" : "glass text-neutral-500"}`}>{p === "TODAS" ? "Todas" : p}</button>)}</div>
    <select value={equipo ?? ""} onChange={(e) => setEquipo(e.target.value || null)} className="min-h-11 w-full rounded-2xl border border-white/10 bg-[#121214] px-3 text-sm text-white outline-none">
      <option value="">Todos los equipos</option>
      {equipos.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>

    {visibles.length === 0 ? <Empty>Ningún jugador con estos filtros.</Empty> : <ol className="space-y-1.5">
      {visibles.slice(0, limite).map((f, i) => <li key={f.player.id}>
        <button type="button" onClick={() => setSelected(f.player)} className="flex w-full items-center gap-3 rounded-2xl bg-white/[.035] px-3 py-2 text-left">
          <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-neutral-600">{i + 1}</span>
          <PlayerImage player={f.player} size={36} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{f.player.name}</p><p className="truncate text-[11px] text-neutral-500">{f.player.position} · {f.player.team} · {millions(f.player.marketValue)}{f.player.status !== "ok" ? " · baja/duda" : ""}</p></div>
          <span className="shrink-0 text-sm font-black tabular-nums text-[#d6ff75]">{valor(f)}</span>
        </button>
      </li>)}
    </ol>}
    {visibles.length > limite && <button type="button" onClick={() => setLimite((l) => l + 50)} className="min-h-11 w-full rounded-2xl glass text-sm font-bold text-neutral-300">Ver 50 más</button>}
    {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)} /> : null}
  </div>;
}
