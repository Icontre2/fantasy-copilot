"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import Image from "next/image";

export type LineupsResponse = {
  teams: Array<{
    teamId: string;
    name: string;
    shortName: string;
    badge: string;
    players: Array<{ externalId: string; playerId?: string; name: string; position: string; probability: number; image?: string }>;
  }>;
  updatedAt: string;
  source: string;
  failedTeams: number;
};

export function LineupsView({ data }: { data: LineupsResponse }) {
  const [query, setQuery] = useState("");
  const [teamId, setTeamId] = useState(data.teams[0]?.teamId ?? "");
  const team = data.teams.find((item) => item.teamId === teamId) ?? data.teams[0];
  const players = useMemo(() => team?.players.filter((player) => player.name.toLowerCase().includes(query.toLowerCase())) ?? [], [team, query]);
  return <div className="space-y-4">
    <section className="rounded-[28px] bg-[#101a39] p-5 text-white shadow-[0_22px_65px_rgba(12,22,52,.2)]">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-white/45">Jornada próxima</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Probabilidad de titularidad</h2>
      <p className="mt-2 text-sm leading-5 text-white/60">Todos los candidatos publicados por FútbolFantasy, no solo once nombres.</p>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {data.teams.map((item) => <button key={item.teamId} type="button" onClick={() => setTeamId(item.teamId)} className={`flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold transition ${item.teamId === team?.teamId ? "bg-[#d6ff75] text-[#101a39]" : "bg-white/10 text-white/70"}`}>{item.badge ? <Image src={item.badge} alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain"/> : null}{item.shortName}</button>)}
      </div>
    </section>

    {team && <section className="rounded-[26px] bg-white p-4 shadow-[0_10px_35px_rgba(16,26,57,.07)]">
      <div className="flex items-center gap-3"><Image src={team.badge} alt="" width={48} height={48} unoptimized className="h-12 w-12 object-contain"/><div className="min-w-0 flex-1"><h3 className="truncate text-xl font-bold text-[#101a39]">{team.name}</h3><p className="text-xs text-neutral-400">{team.players.length} candidatos publicados</p></div></div>
      <label className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f3f5f8] px-3 py-2.5"><Search size={17} className="text-neutral-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jugador" className="w-full bg-transparent text-sm outline-none"/></label>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((player) => <PlayerProbability key={player.externalId} player={player}/>) }
      </div>
    </section>}

    <a href={data.source} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white p-3 text-xs font-semibold text-neutral-500">Fuente: FútbolFantasy <ExternalLink size={14}/></a>
    {data.failedTeams > 0 && <p className="text-center text-xs text-amber-700">{data.failedTeams} equipos no pudieron actualizarse ahora mismo.</p>}
  </div>;
}

function PlayerProbability({ player }: { player: LineupsResponse["teams"][number]["players"][number] }) {
  const tone = player.probability >= 70 ? "bg-[#efffc9] text-[#315408]" : player.probability >= 40 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700";
  return <article className="relative overflow-hidden rounded-2xl bg-[#f5f6f8] p-3 text-center"><div className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-white">{player.image ? <Image src={player.image} alt="" width={64} height={64} unoptimized className="h-full w-full object-contain"/> : <span className="text-lg font-black text-neutral-300">{player.name.slice(0,1)}</span>}</div><p className="mt-2 truncate text-sm font-semibold text-[#101a39]">{player.name}</p><p className="text-[10px] text-neutral-400">{player.position || "Jugador"}</p><span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-black ${tone}`}>{player.probability}%</span></article>;
}
