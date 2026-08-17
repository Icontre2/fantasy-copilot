"use client";

import { useEffect, useMemo, useState } from "react";
import { get } from "./api";
import { millions, UNKNOWN } from "./format";
import type { MarketValuePoint, Player, TeamsResponse } from "./types";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";
import { mergeComparisonPlayers, type ComparisonPlayer } from "./compare-players";

type Histories = Record<string, MarketValuePoint[]>;

export function CompareView({ data }: { data: TeamsResponse }) {
  const ownedPlayers = useMemo(() => data.teams.flatMap((team) => team.players), [data]);
  const [catalog, setCatalog] = useState<Player[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const players = useMemo(() => mergeComparisonPlayers(catalog, ownedPlayers), [catalog, ownedPlayers]);
  // Quien tiene a cada jugador. Ya viene en las plantillas: no cuesta una peticion.
  const ownerOf = useMemo(() => new Map(data.teams.flatMap((team) => team.players.map((player) => [player.id, team.manager.name] as const))), [data]);
  const [firstId, setFirstId] = useState(players[0]?.id ?? "");
  const [secondId, setSecondId] = useState(players[1]?.id ?? "");
  const [histories, setHistories] = useState<Histories>({});
  const [detail, setDetail] = useState<Player | null>(null);
  const first = players.find((player) => player.id === firstId) ?? players[0];
  const second = players.find((player) => player.id === secondId) ?? players[1] ?? players[0];
  const selectedFirstId = first?.id ?? "";
  const selectedSecondId = second?.id ?? "";

  useEffect(() => {
    let cancelled = false;
    get<{ players: Player[] }>("/api/fantasy/players")
      .then((response) => { if (!cancelled) setCatalog(response.players); })
      .catch(() => { if (!cancelled) setCatalogError(true); })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([selectedFirstId, selectedSecondId].filter(Boolean).map(async (id) => [id, (await get<{ history: MarketValuePoint[] }>(`/api/fantasy/players/${encodeURIComponent(id)}/history`)).history] as const))
      .then((entries) => { if (!cancelled) setHistories((current) => ({ ...current, ...Object.fromEntries(entries) })); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [selectedFirstId, selectedSecondId]);

  if (!first || !second) return <p className="text-sm text-neutral-400">No hay suficientes jugadores para comparar.</p>;
  return <div className="space-y-4">
    <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Cara a cara</p><h2 className="text-2xl font-bold text-white">Comparativa</h2><p className="mt-1 text-xs text-neutral-500">{catalogLoading ? "Cargando catálogo completo…" : `${players.length} jugadores activos, incluidos libres y mercado.`}{catalogError ? " No se pudo ampliar el catálogo; se muestran las plantillas de tu liga." : ""}</p></div>
    <div className="grid grid-cols-2 gap-3"><Picker label="Jugador A" value={selectedFirstId} setValue={setFirstId} players={players}/><Picker label="Jugador B" value={selectedSecondId} setValue={setSecondId} players={players}/></div>
    <div className="relative grid grid-cols-2 gap-3"><PlayerCard player={first} owner={ownerOf.get(first.id)} onSelect={setDetail}/><span className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black px-2 py-1 text-xs font-black text-neutral-400">VS</span><PlayerCard player={second} owner={ownerOf.get(second.id)} onSelect={setDetail}/></div>
    {/*
      El historico de cotizacion ya se descarga para calcular las tendencias:
      pintarlo no cuesta ninguna peticion mas, y una linea dice de un vistazo lo
      que dos cifras de tendencia tardan en explicar.
    */}
    <div className="grid grid-cols-2 gap-3">
      <Spark history={histories[first.id]}/>
      <Spark history={histories[second.id]}/>
    </div>
    <section className="rounded-[26px] glass p-4"><p className="mb-4 text-center text-xs text-neutral-500">Comparación con datos oficiales. La tendencia usa el histórico real de cotización.</p><div className="space-y-1">
      <Comparison label="Valor" left={millions(first.marketValue)} right={millions(second.marketValue)} leftNumber={first.marketValue} rightNumber={second.marketValue}/>
      <Comparison label="Cláusula" left={millions(first.buyoutClause)} right={millions(second.buyoutClause)} leftNumber={first.buyoutClause} rightNumber={second.buyoutClause}/>
      <Comparison label="Puntos" left={String(first.points)} right={String(second.points)} leftNumber={first.points} rightNumber={second.points}/>
      <Comparison label="Media" left={String(first.averagePoints)} right={String(second.averagePoints)} leftNumber={first.averagePoints} rightNumber={second.averagePoints}/>
      <Comparison label="Tendencia 7d" left={trend(histories[first.id], 7)} right={trend(histories[second.id], 7)}/>
      <Comparison label="Tendencia 30d" left={trend(histories[first.id], 30)} right={trend(histories[second.id], 30)}/>
      <Comparison label="Propietario" left={ownerOf.get(first.id) ?? UNKNOWN} right={ownerOf.get(second.id) ?? UNKNOWN}/>
    </div>
    {/*
      Lo que costaria ficharlos por clausula. Es una suma de datos oficiales, no
      una recomendacion: no dice si conviene, solo cuanto hace falta tener.
    */}
    {first.buyoutClause !== undefined && second.buyoutClause !== undefined && (
      <p className="mt-4 border-t border-white/10 pt-3 text-center text-xs text-neutral-400">
        Ficharlos a los dos por cláusula costaría{" "}
        <strong className="text-white">{millions(first.buyoutClause + second.buyoutClause)}</strong>
      </p>
    )}
    </section>
    {detail && <PlayerDetails player={detail} onClose={() => setDetail(null)}/>}
  </div>;
}

function Picker({ label, value, setValue, players }: { label: string; value: string; setValue: (value: string) => void; players: ComparisonPlayer[] }) { return <label className="text-xs font-semibold text-neutral-500">{label}<select value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl glass px-3 text-sm text-white">{players.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.team} · {player.position}</option>)}</select></label>; }
function PlayerCard({ player, owner, onSelect }: { player: ComparisonPlayer; owner?: string; onSelect: (player: Player) => void }) { return <button type="button" onClick={() => onSelect(player)} className="glass rounded-[24px] p-4 text-center"><span className="mx-auto block w-fit"><PlayerImage player={player} size={68}/></span><p className="mt-2 truncate font-bold text-white">{player.name}</p><p className="truncate text-xs text-neutral-500">{player.team} · {player.position}</p><p className="mt-1 truncate text-[11px] text-[#a78bfa]">{owner ?? "Libre"}</p></button>; }
function Comparison({ label, left, right, leftNumber, rightNumber }: { label: string; left: string; right: string; leftNumber?: number; rightNumber?: number }) { const leftWins = leftNumber !== undefined && rightNumber !== undefined && leftNumber > rightNumber; const rightWins = leftNumber !== undefined && rightNumber !== undefined && rightNumber > leftNumber; return <div className="grid grid-cols-[1fr_1.15fr_1fr] items-center gap-2 rounded-xl px-2 py-2.5 text-sm"><span className={`text-left font-bold ${leftWins ? "text-emerald-400" : "text-neutral-300"}`}>{left}</span><span className="text-center text-xs text-neutral-600">{label}</span><span className={`text-right font-bold ${rightWins ? "text-emerald-400" : "text-neutral-300"}`}>{right}</span></div>; }
function trend(history: MarketValuePoint[] | undefined, range: number) { if (!history || history.length < 2) return UNKNOWN; const sorted = [...history].sort((a,b) => a.date.localeCompare(b.date)); const latest = sorted.at(-1); if (!latest) return UNKNOWN; const cutoff = Date.parse(latest.date) - range * 86_400_000; const first = sorted.find((point) => Date.parse(point.date) >= cutoff); if (!first || first === latest) return UNKNOWN; const delta = latest.marketValue - first.marketValue; return `${delta >= 0 ? "+" : "−"}${millions(Math.abs(delta))}`; }

/** Linea del historico real de cotizacion. Sin datos no dibuja nada inventado. */
function Spark({ history }: { history?: MarketValuePoint[] }) {
  if (!history || history.length < 2) {
    return <div className="grid h-14 place-items-center rounded-2xl glass text-[10px] text-neutral-600">Sin histórico</div>;
  }
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((point) => point.marketValue);
  const min = Math.min(...values);
  const range = Math.max(Math.max(...values) - min, 1);
  const coords = sorted
    .map((point, index) => `${(index / (sorted.length - 1)) * 100},${21 - ((point.marketValue - min) / range) * 18}`)
    .join(" ");
  const sube = (values.at(-1) ?? 0) >= (values[0] ?? 0);
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-14 w-full rounded-2xl glass px-2" role="img" aria-label="Evolución del valor">
      <polyline points={coords} fill="none" stroke={sube ? "#34d399" : "#fb7185"} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
