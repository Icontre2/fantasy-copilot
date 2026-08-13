"use client";

import { useMemo, useState } from "react";
import { millions, UNKNOWN } from "./format";
import type { Player, TeamsResponse } from "./types";
import { Card, SectionTitle } from "./ui";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";

export function CompareView({ data }: { data: TeamsResponse }) {
  const players = useMemo(() => Array.from(new Map(data.teams.flatMap((team) => team.players).map((player) => [player.id, player])).values()).sort((a, b) => a.name.localeCompare(b.name)), [data]);
  const [firstId, setFirstId] = useState(players[0]?.id ?? ""); const [secondId, setSecondId] = useState(players[1]?.id ?? ""); const [detail, setDetail] = useState<Player | null>(null);
  const selected = [players.find((p) => p.id === firstId), players.find((p) => p.id === secondId)].filter((p): p is Player => Boolean(p));
  return <Card><SectionTitle>Comparar jugadores</SectionTitle><div className="grid gap-2 sm:grid-cols-2"><Picker label="Jugador 1" value={firstId} setValue={setFirstId} players={players} /><Picker label="Jugador 2" value={secondId} setValue={setSecondId} players={players} /></div><div className="mt-5 grid grid-cols-2 gap-3">{selected.map((player) => <button type="button" key={player.id} onClick={() => setDetail(player)} className="rounded-2xl border border-neutral-200 p-3 text-left hover:bg-neutral-50"><PlayerImage player={player} size={64} /><h3 className="mt-2 font-semibold">{player.name}</h3><p className="text-xs text-neutral-500">{player.position} · {player.team}</p><dl className="mt-3 space-y-1 text-sm"><Row label="Valor" value={millions(player.marketValue)} /><Row label="Puntos" value={String(player.points)} /><Row label="Media" value={String(player.averagePoints)} /><Row label="Año pasado" value={player.lastSeasonPoints === undefined ? UNKNOWN : String(player.lastSeasonPoints)} /></dl></button>)}</div>{detail && <PlayerDetails player={detail} onClose={() => setDetail(null)} />}</Card>;
}
function Picker({ label, value, setValue, players }: { label: string; value: string; setValue: (value: string) => void; players: Player[] }) { return <label className="text-sm font-medium">{label}<select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2">{players.map((player) => <option key={player.id} value={player.id}>{player.name} ({player.team})</option>)}</select></label>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-2"><dt className="text-neutral-500">{label}</dt><dd className="font-medium tabular-nums">{value}</dd></div>; }
