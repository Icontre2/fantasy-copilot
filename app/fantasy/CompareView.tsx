"use client";

import { useEffect, useMemo, useState } from "react";
import { get } from "./api";
import { millions, UNKNOWN } from "./format";
import type { MarketValuePoint, Player, TeamsResponse } from "./types";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";

type SquadPlayer = TeamsResponse["teams"][number]["players"][number];
type Histories = Record<string, MarketValuePoint[]>;

export function CompareView({ data }: { data: TeamsResponse }) {
  const players = useMemo(() => Array.from(new Map(data.teams.flatMap((team) => team.players).map((player) => [player.id, player])).values()).sort((a, b) => a.name.localeCompare(b.name)), [data]);
  const [firstId, setFirstId] = useState(players[0]?.id ?? "");
  const [secondId, setSecondId] = useState(players[1]?.id ?? "");
  const [histories, setHistories] = useState<Histories>({});
  const [detail, setDetail] = useState<Player | null>(null);
  const first = players.find((player) => player.id === firstId);
  const second = players.find((player) => player.id === secondId);

  useEffect(() => {
    let cancelled = false;
    Promise.all([firstId, secondId].filter(Boolean).map(async (id) => [id, (await get<{ history: MarketValuePoint[] }>(`/api/fantasy/players/${encodeURIComponent(id)}/history`)).history] as const))
      .then((entries) => { if (!cancelled) setHistories((current) => ({ ...current, ...Object.fromEntries(entries) })); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [firstId, secondId]);

  if (!first || !second) return <p className="text-sm text-neutral-400">No hay suficientes jugadores para comparar.</p>;
  return <div className="space-y-4">
    <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Cara a cara</p><h2 className="text-2xl font-bold text-white">Comparativa</h2></div>
    <div className="grid grid-cols-2 gap-3"><Picker label="Jugador A" value={firstId} setValue={setFirstId} players={players}/><Picker label="Jugador B" value={secondId} setValue={setSecondId} players={players}/></div>
    <div className="relative grid grid-cols-2 gap-3"><PlayerCard player={first} onSelect={setDetail}/><span className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black px-2 py-1 text-xs font-black text-neutral-400">VS</span><PlayerCard player={second} onSelect={setDetail}/></div>
    <section className="rounded-[26px] border border-white/8 bg-[#121214] p-4"><p className="mb-4 text-center text-xs text-neutral-500">Comparación con datos oficiales. La tendencia usa el histórico real de cotización.</p><div className="space-y-1">
      <Comparison label="Valor" left={millions(first.marketValue)} right={millions(second.marketValue)} leftNumber={first.marketValue} rightNumber={second.marketValue}/>
      <Comparison label="Cláusula" left={millions(first.buyoutClause)} right={millions(second.buyoutClause)} leftNumber={first.buyoutClause} rightNumber={second.buyoutClause}/>
      <Comparison label="Puntos" left={String(first.points)} right={String(second.points)} leftNumber={first.points} rightNumber={second.points}/>
      <Comparison label="Media" left={String(first.averagePoints)} right={String(second.averagePoints)} leftNumber={first.averagePoints} rightNumber={second.averagePoints}/>
      <Comparison label="Tendencia 7d" left={trend(histories[first.id], 7)} right={trend(histories[second.id], 7)}/>
      <Comparison label="Tendencia 30d" left={trend(histories[first.id], 30)} right={trend(histories[second.id], 30)}/>
    </div></section>
    {detail && <PlayerDetails player={detail} onClose={() => setDetail(null)}/>}
  </div>;
}

function Picker({ label, value, setValue, players }: { label: string; value: string; setValue: (value: string) => void; players: SquadPlayer[] }) { return <label className="text-xs font-semibold text-neutral-500">{label}<select value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#121214] px-3 text-sm text-white">{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>; }
function PlayerCard({ player, onSelect }: { player: SquadPlayer; onSelect: (player: Player) => void }) { return <button type="button" onClick={() => onSelect(player)} className="rounded-[24px] border border-[#7c3aed]/25 bg-[#121214] p-4 text-center"><span className="mx-auto block w-fit"><PlayerImage player={player} size={68}/></span><p className="mt-2 truncate font-bold text-white">{player.name}</p><p className="truncate text-xs text-neutral-500">{player.team} · {player.position}</p></button>; }
function Comparison({ label, left, right, leftNumber, rightNumber }: { label: string; left: string; right: string; leftNumber?: number; rightNumber?: number }) { const leftWins = leftNumber !== undefined && rightNumber !== undefined && leftNumber > rightNumber; const rightWins = leftNumber !== undefined && rightNumber !== undefined && rightNumber > leftNumber; return <div className="grid grid-cols-[1fr_1.15fr_1fr] items-center gap-2 rounded-xl px-2 py-2.5 text-sm"><span className={`text-left font-bold ${leftWins ? "text-emerald-400" : "text-neutral-300"}`}>{left}</span><span className="text-center text-xs text-neutral-600">{label}</span><span className={`text-right font-bold ${rightWins ? "text-emerald-400" : "text-neutral-300"}`}>{right}</span></div>; }
function trend(history: MarketValuePoint[] | undefined, range: number) { if (!history || history.length < 2) return UNKNOWN; const sorted = [...history].sort((a,b) => a.date.localeCompare(b.date)); const latest = sorted.at(-1); if (!latest) return UNKNOWN; const cutoff = Date.parse(latest.date) - range * 86_400_000; const first = sorted.find((point) => Date.parse(point.date) >= cutoff); if (!first || first === latest) return UNKNOWN; const delta = latest.marketValue - first.marketValue; return `${delta >= 0 ? "+" : "−"}${millions(Math.abs(delta))}`; }
