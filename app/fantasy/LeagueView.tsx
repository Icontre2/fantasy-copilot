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

  if (data.teams.length === 0) return <Empty>No se ha podido leer ninguna plantilla de esta liga.</Empty>;

  const byTeamId = new Map(data.teams.map((team) => [team.teamId, team]));
  const rows = data.standing.filter((row) => byTeamId.has(row.teamId));

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#8b5cf6]">Tu liga</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">Mis rivales</h2>
        <p className="mt-1 text-sm text-neutral-500">Así va la clasificación ahora mismo.</p>
      </div>

      {data.failedTeamIds.length > 0 && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          No se pudieron leer {data.failedTeamIds.length} plantilla(s). Lo que ves está incompleto.
        </p>
      )}

      <div className="space-y-2.5">
        {rows.map((row) => {
          const team = byTeamId.get(row.teamId);
          const isOpen = openTeamId === row.teamId;
          const initials = row.manager.name.trim().slice(0, 2).toUpperCase();
          return (
            <div key={row.teamId}>
              <button
                type="button"
                onClick={() => setOpenTeamId(isOpen ? null : row.teamId)}
                aria-expanded={isOpen}
                className={`w-full rounded-[24px] border p-4 text-left transition active:scale-[.99] ${
                  isOpen
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/8 shadow-[0_0_28px_rgba(139,92,246,.12)]"
                    : "border-white/10 bg-[#0d0d10]"
                }`}
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
                  <ChevronDown size={17} className={`shrink-0 text-neutral-500 transition ${isOpen ? "rotate-180 text-[#a78bfa]" : ""}`} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Dato label="Valor equipo" value={millions(team?.teamValue)} />
                  {/*
                    `positive` es sobre el SIGNO del número, no sobre si se
                    conoce. Antes comprobaba `!== undefined`, así que una caja
                    en negativo —o a cero— salía en verde igual, como si fuera
                    buena noticia. Es justo la mentira visual que esta pantalla
                    evita en todo lo demás.
                  */}
                  <Dato
                    label="Caja"
                    value={millions(team?.teamMoney)}
                    positive={team?.teamMoney !== undefined && team.teamMoney > 0}
                  />
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
            </div>
          );
        })}
      </div>

      {selectedPlayer && <PlayerDetails player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}

/**
 * La foto de un manager, con las iniciales de respaldo.
 *
 * `mapManager` prueba varios nombres de campo posibles para encontrar la foto,
 * porque LALIGA no documenta cuál usa cada endpoint — no está verificado contra
 * una respuesta real. Si la URL que adivina no sirve, un `<img>` a secas se
 * queda con el icono roto del navegador. Con `onError` se cae a las iniciales,
 * que es exactamente lo que se enseña cuando no hay foto ninguna.
 */
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
