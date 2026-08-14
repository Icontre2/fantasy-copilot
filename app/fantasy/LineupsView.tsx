"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import Image from "next/image";
import type { Player } from "./types";
import { PlayerDetails } from "./PlayerDetails";

export type LineupsResponse = {
  teams: Array<{
    teamId: string;
    name: string;
    shortName: string;
    badge: string;
    players: Array<{ externalId: string; playerId?: string; name: string; position: string; probability: number; image?: string; player?: Player }>;
  }>;
  updatedAt: string;
  source: string;
  failedTeams: number;
};

export function LineupsView({ data }: { data: LineupsResponse }) {
  const [query, setQuery] = useState("");
  const [teamId, setTeamId] = useState(data.teams[0]?.teamId ?? "");
  const [selected, setSelected] = useState<Player | null>(null);
  const team = data.teams.find((item) => item.teamId === teamId) ?? data.teams[0];
  const players = useMemo(() => team?.players.filter((player) => player.name.toLowerCase().includes(query.toLowerCase())) ?? [], [team, query]);
  return <div className="space-y-4">
    <section className="overflow-hidden rounded-[28px] border border-[#7c3aed]/30 bg-[linear-gradient(145deg,#17121f,#251440)] p-5 text-white shadow-[0_22px_65px_rgba(0,0,0,.45)]">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Jornada próxima</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Probabilidad de titularidad</h2>
      <p className="mt-2 text-sm leading-5 text-white/55">Todos los candidatos publicados por FútbolFantasy, no solo once nombres.</p>
      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {data.teams.map((item) => <button key={item.teamId} type="button" onClick={() => setTeamId(item.teamId)} aria-pressed={item.teamId === team?.teamId} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-xs font-bold transition ${item.teamId === team?.teamId ? "bg-[#7c3aed] text-white" : "border border-white/10 bg-white/[.06] text-white/70"}`}>{item.badge ? <Image src={item.badge} alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain"/> : null}{item.shortName}</button>)}
      </div>
    </section>

    {team && <section className="rounded-[26px] border border-white/8 bg-[#121214] p-4 shadow-[0_10px_35px_rgba(0,0,0,.3)]">
      <div className="flex items-center gap-3">{team.badge ? <Image src={team.badge} alt="" width={48} height={48} unoptimized className="h-12 w-12 shrink-0 object-contain"/> : null}<div className="min-w-0 flex-1"><h3 className="truncate text-xl font-bold text-white">{team.name}</h3><p className="text-xs text-neutral-500">{team.players.length} candidatos publicados</p></div></div>
      <label className="mt-4 flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3"><Search size={17} className="text-neutral-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jugador" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"/></label>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((player) => <PlayerProbability key={player.externalId} player={player} onSelect={setSelected}/>) }
      </div>
    </section>}

    <a href={data.source} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#121214] p-3 text-xs font-semibold text-neutral-400">Fuente: FútbolFantasy <ExternalLink size={14}/></a>
    {data.failedTeams > 0 && <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-300">{data.failedTeams} equipos no pudieron actualizarse ahora mismo.</p>}
    {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)} /> : null}
  </div>;
}

/**
 * Candidato con su porcentaje.
 *
 * El color va SIEMPRE acompañado de una palabra ("Probable", "Duda", "Poco
 * probable"): un semaforo sin texto no se puede leer con daltonismo ni al sol.
 * El porcentaje es el de FutbolFantasy tal cual, sin retocar.
 */
function PlayerProbability({ player, onSelect }: { player: LineupsResponse["teams"][number]["players"][number]; onSelect: (player: Player) => void }) {
  const alta = player.probability >= 70;
  const media = !alta && player.probability >= 40;
  const tone = alta
    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
    : media
      ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
      : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
  const etiqueta = alta ? "Probable" : media ? "Duda" : "Poco probable";
  return <button type="button" disabled={!player.player} onClick={() => player.player && onSelect(player.player)} className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[.03] p-3 text-center transition active:scale-[.98] disabled:cursor-default" aria-label={player.player ? `Ver histórico de ${player.name}` : player.name}><div className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-white/[.06]">{player.image ? <Image src={player.image} alt="" width={64} height={64} unoptimized className="h-full w-full object-contain"/> : <span className="text-lg font-black text-neutral-600">{player.name.slice(0,1)}</span>}</div><p className="mt-2 truncate text-sm font-semibold text-white">{player.name}</p><p className="text-[10px] text-neutral-500">{player.position || "Jugador"}</p><span className={`mt-2 inline-flex flex-col rounded-xl px-2.5 py-1 text-xs font-black ${tone}`}>{player.probability}%<span className="text-[9px] font-semibold opacity-80">{etiqueta}</span></span></button>;
}
