"use client";

import { useMemo, useState } from "react";
import { Search, TrendingUp } from "lucide-react";
import { millions, percent, signedMillions } from "./format";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";
import { conteoPorPosicion, ordenarSubidas, POSICIONES, type FiltroDePosicion, type OrdenDeSubida, type Subida } from "./risers";
import { trendTone } from "./trend";
import type { AlertsResponse, Player } from "./types";
import { DataNotes, Empty } from "./ui";

/**
 * Quién sube más de valor al día — en euros y en porcentaje.
 *
 * Se alimenta de la MISMA respuesta que Alertas: la tendencia diaria ya está
 * calculada ahí, así que esta pantalla no cuesta ni una petición más. Lo que sí
 * hereda es su cobertura, y por eso lo dice en pantalla en vez de dejar creer
 * que el ranking cubre la liga entera. Ver `risers.ts`.
 */

const ETIQUETA_DE_POSICION: Record<FiltroDePosicion, string> = {
  TODAS: "Todas", POR: "Porteros", DEF: "Defensas", MED: "Medios", DEL: "Delanteros",
};
const ORDENES: Array<{ id: OrdenDeSubida; label: string; ayuda: string }> = [
  { id: "EUROS", label: "€ / día", ayuda: "Quién mueve más dinero al día." },
  { id: "PORCENTAJE", label: "% / día", ayuda: "Quién se revaloriza más deprisa, cueste lo que cueste." },
];

export function RisersView({ data }: { data: AlertsResponse }) {
  const [orden, setOrden] = useState<OrdenDeSubida>("EUROS");
  const [posicion, setPosicion] = useState<FiltroDePosicion>("TODAS");
  const [query, setQuery] = useState("");
  const [incluirBajadas, setIncluirBajadas] = useState(false);
  const [selected, setSelected] = useState<Player | null>(null);

  const porPosicion = useMemo(() => conteoPorPosicion(data.alerts), [data.alerts]);
  const { filas, sinTendencia } = useMemo(
    () => ordenarSubidas({ alerts: data.alerts, orden, posicion, busqueda: query, incluirBajadas }),
    [data.alerts, orden, posicion, query, incluirBajadas],
  );
  const ayuda = ORDENES.find((o) => o.id === orden)?.ayuda ?? "";

  return <div className="space-y-4">
    <section className="glass-strong overflow-hidden rounded-[28px] p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Quién se está revalorizando</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Subidas</h2>
          <p className="mt-2 text-sm leading-5 text-white/55">Variación media diaria del valor, en euros y en porcentaje.</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#7c3aed] text-white"><TrendingUp size={22}/></span>
      </div>
    </section>

    <div className="flex gap-2" aria-label="Ordenar subidas">{ORDENES.map((option) =>
      <button key={option.id} type="button" onClick={() => setOrden(option.id)} aria-pressed={orden === option.id} className={`min-h-11 grow rounded-2xl px-3 text-sm font-bold ${orden === option.id ? "bg-[#7c3aed] text-white" : "glass text-neutral-500"}`}>{option.label}</button>)}
    </div>
    <p className="px-1 text-[11px] leading-4 text-neutral-500">{ayuda}</p>

    <label className="flex min-h-12 items-center gap-2 rounded-2xl glass px-4 text-neutral-500"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jugador, equipo o manager…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"/></label>

    <div className="flex flex-wrap gap-2" aria-label="Filtrar por posición">{POSICIONES.map((option) => {
      const vacia = porPosicion[option] === 0;
      return <button key={option} type="button" disabled={vacia} onClick={() => setPosicion(option)} aria-pressed={posicion === option} className={`min-h-11 grow rounded-2xl px-3 text-sm font-bold disabled:opacity-40 ${posicion === option ? "bg-[#7c3aed] text-white" : "glass text-neutral-500"}`}>{ETIQUETA_DE_POSICION[option]}{option !== "TODAS" && !vacia ? <span className="ml-1.5 text-[11px] font-semibold opacity-60 tabular-nums">{porPosicion[option]}</span> : null}</button>;
    })}</div>

    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl glass px-4 text-sm text-neutral-300">
      <span>Incluir a los que bajan</span>
      <input type="checkbox" checked={incluirBajadas} onChange={(event) => setIncluirBajadas(event.target.checked)} className="h-5 w-5 accent-[#7c3aed]"/>
    </label>

    {filas.length === 0
      ? <Empty>Ningún jugador vigilado sube de valor con este criterio.</Empty>
      : <div className="space-y-3">{filas.map((fila, indice) => <RiserCard key={`${fila.alert.owner.teamId}-${fila.alert.player.id}`} fila={fila} puesto={indice + 1} orden={orden} onSelect={setSelected}/>)}</div>}

    {/*
      El aviso de cobertura no es letra pequeña: sin él, un ranking que solo mira
      a los jugadores cercanos a su cláusula se lee como si fuera la liga entera.
    */}
    <p className="rounded-2xl glass px-4 py-3 text-xs leading-5 text-neutral-500">
      Esta lista cubre a los jugadores que Alertas ya vigila —los que están cerca de su cláusula—, no a toda la liga.
      Un jugador lejos de su cláusula pero subiendo mucho no aparece aquí.
      {sinTendencia > 0 ? ` ${sinTendencia} sin histórico suficiente para calcular tendencia.` : ""}
      {data.skippedForBudget > 0 ? ` ${data.skippedForBudget} fuera del límite de consultas.` : ""}
    </p>
    <DataNotes notes={data.dataNotes}/>
    {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)}/> : null}
  </div>;
}

function RiserCard({ fila, puesto, orden, onSelect }: { fila: Subida; puesto: number; orden: OrdenDeSubida; onSelect: (player: Player) => void }) {
  const { alert, euros, ratio } = fila;
  // El criterio activo manda: se resalta el que ordena, y el otro acompaña.
  const principal = orden === "EUROS" ? signedMillions(euros) : percent(ratio, 2);
  const secundario = orden === "EUROS" ? `${percent(ratio, 2)} al día` : `${signedMillions(euros)} al día`;

  return <article className="rounded-[26px] border border-white/8 bg-[#0d0d10] p-4 shadow-[0_12px_36px_rgba(0,0,0,.22)]">
    <button type="button" onClick={() => onSelect(alert.player)} className="flex w-full items-center gap-3 text-left">
      <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-neutral-600">{puesto}</span>
      <PlayerImage player={alert.player} size={52}/>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{alert.player.name}</p>
        <p className="truncate text-xs text-neutral-500">{alert.player.position} · {alert.player.team} · {alert.owner.managerName}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${trendTone(euros)}`}>{principal}</span>
    </button>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Metric label="Valor" value={millions(alert.official.marketValue)}/>
      <Metric label="Ritmo" value={secundario}/>
    </div>
  </article>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/[.04] px-3 py-2">
    <p className="text-[11px] uppercase tracking-[.12em] text-neutral-500">{label}</p>
    <p className="mt-0.5 text-sm font-bold tabular-nums text-white">{value}</p>
  </div>;
}
