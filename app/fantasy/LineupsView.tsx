"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search, ShieldCheck, Star } from "lucide-react";
import Image from "next/image";
import type { Player } from "./types";
import { PlayerDetails } from "./PlayerDetails";

export type LineupsResponse = {
  teams: Array<{
    teamId: string;
    name: string;
    shortName: string;
    badge: string;
    players: Array<{ externalId: string; playerId?: string; name: string; position: string; probability?: number; expectedStarter?: boolean; image?: string; player?: Player }>;
  }>;
  updatedAt: string;
  source: string;
  failedTeams: number;
};

type Slot = "GK" | "DEF" | "MID" | "FWD";

const slotFor = (position: string): Slot => {
  const value = position.toUpperCase();
  if (value.includes("GK") || value.includes("POR")) return "GK";
  if (value.includes("DEF") || value === "DF") return "DEF";
  if (value.includes("FWD") || value.includes("DEL") || value === "FW") return "FWD";
  return "MID";
};

const sortCandidates = (players: LineupsResponse["teams"][number]["players"]) => [...players].sort((a, b) => Number(Boolean(b.expectedStarter)) - Number(Boolean(a.expectedStarter)) || (b.probability ?? -1) - (a.probability ?? -1));

function chooseXI(players: LineupsResponse["teams"][number]["players"]) {
  const groups: Record<Slot, typeof players> = { GK: [], DEF: [], MID: [], FWD: [] };
  players.forEach((player) => groups[slotFor(player.position)].push(player));
  (Object.keys(groups) as Slot[]).forEach((slot) => { groups[slot] = sortCandidates(groups[slot]); });
  const targets: Record<Slot, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };
  const selected = (Object.keys(targets) as Slot[]).flatMap((slot) => groups[slot].slice(0, targets[slot]));
  if (selected.length >= 11) return selected.slice(0, 11);
  const used = new Set(selected.map((player) => player.externalId));
  return [...selected, ...sortCandidates(players).filter((player) => !used.has(player.externalId))].slice(0, 11);
}

export function LineupsView({ data }: { data: LineupsResponse }) {
  const [query, setQuery] = useState("");
  const [teamId, setTeamId] = useState(data.teams[0]?.teamId ?? "");
  const [selected, setSelected] = useState<Player | null>(null);
  const team = data.teams.find((item) => item.teamId === teamId) ?? data.teams[0];
  const players = useMemo(() => team?.players.filter((player) => player.name.toLowerCase().includes(query.toLowerCase())) ?? [], [team, query]);
  const xi = useMemo(() => chooseXI(team?.players ?? []), [team]);
  const starters = useMemo(() => new Set(xi.map((player) => player.externalId)), [xi]);
  const bench = useMemo(() => sortCandidates(team?.players.filter((player) => !starters.has(player.externalId)) ?? []).slice(0, 7), [team, starters]);

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#090a0c] text-white shadow-[0_20px_70px_rgba(0,0,0,.35)]">
      <div className="border-b border-white/8 px-4 pb-4 pt-5 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#a78bfa]">Jornada próxima</p><h2 className="mt-1 text-2xl font-black tracking-tight">Once probable</h2><p className="mt-1 text-xs leading-5 text-white/45">Vista tipo videojuego con la probabilidad real de titularidad.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] px-3 py-2 text-right"><p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Actualizado</p><p className="mt-0.5 text-xs font-bold text-white/80">Ahora</p></div>
        </div>
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {data.teams.map((item) => <button key={item.teamId} type="button" onClick={() => setTeamId(item.teamId)} aria-pressed={item.teamId === team?.teamId} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-xs font-black transition active:scale-[.98] ${item.teamId === team?.teamId ? "bg-white text-black shadow-[0_6px_22px_rgba(255,255,255,.12)]" : "border border-white/10 bg-white/[.05] text-white/65"}`}>{item.badge ? <Image src={item.badge} alt="" width={24} height={24} unoptimized className="h-6 w-6 object-contain"/> : null}{item.shortName}</button>)}
        </div>
      </div>

      {team && <>
        <div className="px-2 pb-2 pt-2 sm:px-4">
          <div className="relative min-h-[590px] overflow-hidden rounded-[24px] border border-white/10 bg-[#143d27] shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,.08),transparent_34%),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:auto,42px_42px,42px_42px]" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/30" />
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
            <div className="absolute inset-x-[22%] bottom-0 h-[17%] border-x border-t border-white/30" />
            <div className="absolute inset-x-[33%] bottom-0 h-[9%] border-x border-t border-white/25" />
            <div className="absolute inset-x-[22%] top-0 h-[17%] border-x border-b border-white/30" />
            <div className="absolute inset-x-[33%] top-0 h-[9%] border-x border-b border-white/25" />
            <div className="absolute left-1/2 top-[16%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/70" />
            <div className="absolute left-1/2 bottom-[16%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/70" />

            <PitchRow players={xi.filter((player) => slotFor(player.position) === "FWD")} top="10%" onSelect={setSelected} />
            <PitchRow players={xi.filter((player) => slotFor(player.position) === "MID")} top="31%" onSelect={setSelected} />
            <PitchRow players={xi.filter((player) => slotFor(player.position) === "DEF")} top="56%" onSelect={setSelected} />
            <PitchRow players={xi.filter((player) => slotFor(player.position) === "GK")} top="78%" onSelect={setSelected} />

            <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-white/10 bg-black/25 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white/55 backdrop-blur">{team.name}</div>
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-xl border border-white/10 bg-black/25 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white/55 backdrop-blur">4-4-2</div>
          </div>
        </div>

        <div className="border-t border-white/8 px-4 pb-4 pt-4 sm:px-5">
          <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Banquillo</p><p className="mt-1 text-sm font-bold text-white">Alternativas</p></div><span className="rounded-full bg-white/[.06] px-2.5 py-1 text-[10px] font-bold text-white/45">{bench.length} jugadores</span></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{bench.map((player) => <PlayerMini key={player.externalId} player={player} onSelect={setSelected} />)}</div>
        </div>
      </>}
    </section>

    <section className="rounded-[26px] border border-white/8 bg-[#0d0e11] p-4">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#a78bfa]">Todos los candidatos</p><h3 className="mt-1 text-lg font-black text-white">Probabilidad de titularidad</h3></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#7c3aed]/12 text-[#c4b5fd]"><Star size={17}/></div></div>
      <label className="mt-4 flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3"><Search size={17} className="text-neutral-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jugador" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"/></label>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{players.map((player) => <PlayerProbability key={player.externalId} player={player} onSelect={setSelected}/>)}</div>
    </section>

    <a href={data.source} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[.025] p-3 text-xs font-semibold text-neutral-400">Fuente: FútbolFantasy <ExternalLink size={14}/></a>
    {data.failedTeams > 0 && <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-300">{data.failedTeams} equipos no pudieron actualizarse ahora mismo.</p>}
    {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)} /> : null}
  </div>;
}

function PitchRow({ players, top, onSelect }: { players: LineupsResponse["teams"][number]["players"]; top: string; onSelect: (player: Player) => void }) {
  return <div className="absolute inset-x-3 flex -translate-y-1/2 items-start justify-center gap-2 sm:inset-x-8 sm:gap-4" style={{ top }}>
    {players.map((player) => <PitchCard key={player.externalId} player={player} onSelect={onSelect} />)}
  </div>;
}

function PitchCard({ player, onSelect }: { player: LineupsResponse["teams"][number]["players"][number]; onSelect: (player: Player) => void }) {
  const likely = player.expectedStarter || (player.probability !== undefined && player.probability >= 70);
  const value = player.probability === undefined ? "—" : `${player.probability}%`;
  return <button type="button" disabled={!player.player} onClick={() => player.player && onSelect(player.player)} className="group w-[70px] shrink-0 text-center disabled:cursor-default sm:w-[86px]" aria-label={player.player ? `Ver histórico de ${player.name}` : player.name}>
    <div className={`relative mx-auto h-[86px] w-[64px] overflow-hidden rounded-[10px] border shadow-[0_8px_18px_rgba(0,0,0,.35)] transition group-active:scale-95 sm:h-[102px] sm:w-[76px] ${likely ? "border-white/80 bg-gradient-to-b from-[#f4c86a] to-[#9b641c]" : "border-white/30 bg-gradient-to-b from-[#343942] to-[#171a1f]"}`}>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-1.5 pt-1 text-[8px] font-black text-black/80"><span>{player.probability ?? "—"}</span><span>{slotFor(player.position)}</span></div>
      {player.image ? <Image src={player.image} alt="" width={76} height={102} unoptimized className="absolute inset-x-0 bottom-0 h-[78%] w-full object-contain object-bottom"/> : <div className="absolute inset-0 grid place-items-center pt-5 text-xl font-black text-white/35">{player.name.slice(0, 1)}</div>}
      <div className="absolute inset-x-0 bottom-0 bg-black/65 px-1 py-1"><p className="truncate text-[8px] font-black text-white sm:text-[9px]">{player.name}</p></div>
    </div>
    <div className="mx-auto mt-1 flex w-fit items-center gap-1 rounded-full border border-white/15 bg-black/55 px-1.5 py-0.5 text-[8px] font-black text-white/80 backdrop-blur"><ShieldCheck size={8}/>{value}</div>
  </button>;
}

function PlayerMini({ player, onSelect }: { player: LineupsResponse["teams"][number]["players"][number]; onSelect: (player: Player) => void }) {
  return <button type="button" disabled={!player.player} onClick={() => player.player && onSelect(player.player)} className="w-[76px] shrink-0 rounded-2xl border border-white/8 bg-white/[.035] p-2 text-left disabled:cursor-default"><div className="grid h-14 place-items-center overflow-hidden rounded-xl bg-white/[.05]">{player.image ? <Image src={player.image} alt="" width={56} height={56} unoptimized className="h-full w-full object-contain"/> : <span className="font-black text-white/35">{player.name.slice(0, 1)}</span>}</div><p className="mt-1 truncate text-[9px] font-bold text-white/75">{player.name}</p><p className="text-[8px] text-white/35">{player.probability === undefined ? "Sin %" : `${player.probability}%`}</p></button>;
}

function PlayerProbability({ player, onSelect }: { player: LineupsResponse["teams"][number]["players"][number]; onSelect: (player: Player) => void }) {
  const alta = player.expectedStarter || (player.probability !== undefined && player.probability >= 70);
  const media = !alta && player.probability !== undefined && player.probability >= 40;
  const tone = alta ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" : media ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30" : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
  const etiqueta = player.expectedStarter ? "Titular publicado" : alta ? "Probable" : media ? "Duda" : "Poco probable";
  const value = player.probability === undefined ? "Sin %" : `${player.probability}%`;
  return <button type="button" disabled={!player.player} onClick={() => player.player && onSelect(player.player)} className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[.03] p-3 text-center transition active:scale-[.98] disabled:cursor-default" aria-label={player.player ? `Ver histórico de ${player.name}` : player.name}><div className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-white/[.06]">{player.image ? <Image src={player.image} alt="" width={64} height={64} unoptimized className="h-full w-full object-contain"/> : <span className="text-lg font-black text-neutral-600">{player.name.slice(0,1)}</span>}</div><p className="mt-2 truncate text-sm font-semibold text-white">{player.name}</p><p className="text-[10px] text-neutral-500">{player.position || "Jugador"}</p><span className={`mt-2 inline-flex flex-col rounded-xl px-2.5 py-1 text-xs font-black ${tone}`}>{value}<span className="text-[9px] font-semibold opacity-80">{etiqueta}</span></span></button>;
}
