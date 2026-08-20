"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { millions, UNKNOWN } from "./format";
import type { Manager, Player, TeamsResponse } from "./types";
import { Empty } from "./ui";
import { PlayerDetails } from "./PlayerDetails";
import { RivalSquad } from "./RivalSquad";

export function LeagueView({ data, leagueId }: { data: TeamsResponse; leagueId: string }) {
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  if (data.teams.length === 0) {
    return <Empty>No se ha podido leer ninguna plantilla de esta liga.</Empty>;
  }

  const byTeamId = new Map(data.teams.map((team) => [team.teamId, team]));
  const rows = data.standing.filter((row) => byTeamId.has(row.teamId));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">Rivales</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">Clasificación de tu liga</h2>
        <p className="mt-1 text-sm text-white/45">Toca un manager para abrir su plantilla.</p>
      </div>

      {data.failedTeamIds.length > 0 && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          No se pudieron leer {data.failedTeamIds.length} plantilla(s). Lo que ves está incompleto.
        </p>
      )}

      <ul className="space-y-3">
        {rows.map((row) => {
          const team = byTeamId.get(row.teamId);
          const isOpen = openTeamId === row.teamId;
          const highlighted = row.position <= 3;
          return (
            <li key={row.teamId}>
              <button
                type="button"
                onClick={() => setOpenTeamId(isOpen ? null : row.teamId)}
                aria-expanded={isOpen}
                className={`w-full overflow-hidden rounded-[26px] border p-4 text-left transition active:scale-[.99] ${
                  isOpen
                    ? "border-[#8b5cf6] bg-[#7c3aed]/10 shadow-[0_0_30px_rgba(124,58,237,.14)]"
                    : "border-white/10 bg-[#0d0f14]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${highlighted ? "bg-amber-400/15 text-amber-300" : "bg-white/[.06] text-white/55"}`}>
                    {row.position}
                  </span>
                  <ManagerAvatar manager={row.manager} active={isOpen} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-white">{row.manager.name}</span>
                    <span className="mt-0.5 block text-xs text-white/45">{row.points} pts</span>
                  </span>
                  <ChevronDown size={17} className={`shrink-0 text-white/35 transition ${isOpen ? "rotate-180 text-[#a78bfa]" : ""}`} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Dato label="Valor equipo" value={millions(team?.teamValue)} />
                  <Dato label="Caja" value={millions(team?.teamMoney)} positive />
                  <Dato label="Jugadores" value={team ? String(team.players.length) : UNKNOWN} />
                </div>
              </button>

              {isOpen && team && (
                <RivalSquad
                  key={team.teamId}
                  leagueId={leagueId}
                  teamId={team.teamId}
                  managerName={team.manager.name}
                  players={team.players}
                  onPlayer={setSelectedPlayer}
                />
              )}
            </li>
          );
        })}
      </ul>

      {selectedPlayer && <PlayerDetails player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}

function ManagerAvatar({ manager, active }: { manager: Manager; active: boolean }) {
  const initials = manager.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border bg-[#171923] text-sm font-black text-white ${active ? "border-[#a78bfa] shadow-[0_0_22px_rgba(124,58,237,.55)]" : "border-white/10"}`}>
      {manager.avatar ? (
        <img src={manager.avatar} alt="" className="h-full w-full object-cover" />
      ) : initials}
    </span>
  );
}

function Dato({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <span className="min-w-0 rounded-2xl bg-white/[.035] px-3 py-2.5">
      <span className="block truncate text-[10px] text-white/35">{label}</span>
      <span className={`mt-1 block truncate text-sm font-bold tabular-nums ${positive && value !== UNKNOWN ? "text-emerald-400" : "text-white"}`}>{value}</span>
    </span>
  );
}
