"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { millions, UNKNOWN } from "./format";
import type { Player, TeamsResponse } from "./types";
import { Empty } from "./ui";
import { PlayerDetails } from "./PlayerDetails";
import { RivalSquad } from "./RivalSquad";

export function LeagueView({ data, leagueId }: { data: TeamsResponse; leagueId: string }) {
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  if (data.standing.length === 0) return <Empty>No se ha podido leer la clasificación de esta liga.</Empty>;

  const byTeamId = new Map(data.teams.map((team) => [team.teamId, team]));
  // La clasificación oficial es la fuente de verdad: no filtramos las filas
  // aunque no hayamos podido cargar todavía la plantilla de algún manager.
  const rows = data.standing;

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#8b5cf6]">Tu liga</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">Clasificación</h2>
        <p className="mt-1 text-sm text-neutral-500">Todos los managers, ordenados por posición.</p>
      </div>

      {data.failedTeamIds.length > 0 && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          Hay {data.failedTeamIds.length} plantilla(s) que no se han podido leer. La clasificación sí se mantiene completa.
        </p>
      )}

      <div className="space-y-2.5">
        {rows.map((row) => {
          const team = byTeamId.get(row.teamId);
          const isOpen = openTeamId === row.teamId;
          const initials = row.manager.name.trim().slice(0, 2).toUpperCase();
          const canOpen = Boolean(team);
          return (
            <div key={row.teamId}>
              <button
                type="button"
                onClick={() => canOpen && setOpenTeamId(isOpen ? null : row.teamId)}
                aria-expanded={canOpen ? isOpen : undefined}
                disabled={!canOpen}
                className={`w-full rounded-[24px] border p-4 text-left transition ${
                  isOpen
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/8 shadow-[0_0_28px_rgba(139,92,246,.12)]"
                    : "border-white/10 bg-[#0d0d10]"
                } ${canOpen ? "active:scale-[.99]" : "opacity-90"}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${row.position <= 3 ? "bg-amber-400 text-black" : "bg-white/[.06] text-neutral-300"}`}>
                    {row.position}
                  </span>
                  <Avatar url={row.manager.avatar} initials={initials} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-white">{row.manager.name}</span>
                    <span className="mt-0.5 block text-xs text-neutral-500">{row.points} pts</span>
                  </span>
                  {team && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{millions(team.teamValue)}</p>
                      <p className="text-[9px] text-neutral-600">valor</p>
                    </div>
                  )}
                  {canOpen && <ChevronDown size={17} className={`shrink-0 text-neutral-500 transition ${isOpen ? "rotate-180 text-[#a78bfa]" : ""}`} />}
                </div>

                {team ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Dato label="Valor equipo" value={millions(team.teamValue)} />
                    <Dato
                      label="Caja"
                      value={millions(team.teamMoney)}
                      positive={team.teamMoney !== undefined && team.teamMoney > 0}
                    />
                    <Dato label="Jugadores" value={String(team.players.length)} />
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-white/[.025] px-3 py-2 text-[11px] text-neutral-500">Plantilla no disponible · datos de clasificación confirmados</p>
                )}
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
            </div>
          );
        })}
      </div>

      {selectedPlayer && <PlayerDetails player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}

function Avatar({ url, initials }: { url?: string; initials: string }) {
  const [fallo, setFallo] = useState(false);
  const mostrarFoto = Boolean(url) && !fallo;
  return (
    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#1b1b20]">
      {mostrarFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFallo(true)} />
      ) : (
        <span className="grid h-full w-full place-items-center text-sm font-black text-[#c4b5fd]">{initials}</span>
      )}
    </span>
  );
}

function Dato({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <span className="min-w-0 rounded-2xl bg-white/[.025] px-3 py-2.5">
      <span className="block truncate text-[10px] text-neutral-500">{label}</span>
      <span className={`mt-1 block truncate text-sm font-bold tabular-nums ${positive ? "text-emerald-400" : "text-neutral-100"}`}>{value}</span>
    </span>
  );
}
