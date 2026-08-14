"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { millions, UNKNOWN } from "./format";
import type { TeamsResponse } from "./types";
import { Card, Empty, SectionTitle } from "./ui";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";
import type { Player } from "./types";

/**
 * Liga: todos los managers y sus plantillas. Solo lectura.
 *
 * No hay ningun indicador de "compra", "vende" ni "recomendado": esta pantalla
 * enseña lo que publica LALIGA y nada mas.
 *
 * Esto era una tabla de seis columnas con `min-w-[560px]`. En un movil de 390
 * px se veian tres y el resto quedaba detras de un scroll horizontal que nadie
 * descubre: "Valor planti…" cortado a mitad de palabra. Ahora es una fila por
 * manager con las cifras debajo, que es lo que pide docs/DIRECCION_VISUAL.md.
 */
export function LeagueView({ data }: { data: TeamsResponse }) {
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  if (data.teams.length === 0) {
    return <Empty>No se ha podido leer ninguna plantilla de esta liga.</Empty>;
  }

  const byTeamId = new Map(data.teams.map((team) => [team.teamId, team]));
  // Se recorre la clasificacion para conservar el orden oficial de la liga.
  const rows = data.standing.filter((row) => byTeamId.has(row.teamId));

  return (
    <div className="space-y-4">
      {data.failedTeamIds.length > 0 && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          No se pudieron leer {data.failedTeamIds.length} plantilla(s). Lo que ves está incompleto.
        </p>
      )}

      <Card>
        <SectionTitle>Participantes</SectionTitle>
        <ul className="space-y-2">
          {rows.map((row) => {
            const team = byTeamId.get(row.teamId);
            const isOpen = openTeamId === row.teamId;
            return (
              <li key={row.teamId}>
                <button
                  type="button"
                  onClick={() => setOpenTeamId(isOpen ? null : row.teamId)}
                  aria-expanded={isOpen}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    isOpen ? "border-[#7c3aed]/50 bg-[#7c3aed]/10" : "border-white/10 bg-white/[.03]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[.06] text-sm font-bold text-neutral-300">
                      {row.position}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-bold text-white">{row.manager.name}</span>
                    <span className="shrink-0 tabular-nums text-sm font-bold text-white">{row.points} pts</span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-neutral-500 transition ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <Dato label="Valor plantilla" value={millions(team?.teamValue)} />
                    {/* La caja ajena no la publica LALIGA: sale `—`, no un cero. */}
                    <Dato label="Caja" value={millions(team?.teamMoney)} />
                    <Dato label="Jugadores" value={team ? String(team.players.length) : UNKNOWN} />
                  </div>
                </button>

                {isOpen && team && <Plantilla team={team} onPlayer={setSelectedPlayer} />}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs leading-4 text-neutral-500">
          Toca un manager para ver su plantilla. Todos estos datos los publica LALIGA. La caja solo
          es visible en tu propio equipo.
        </p>
      </Card>

      {selectedPlayer && <PlayerDetails player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}

/** Plantilla del manager abierto, justo debajo de su fila. */
function Plantilla({
  team,
  onPlayer,
}: {
  team: TeamsResponse["teams"][number];
  onPlayer: (player: Player) => void;
}) {
  return (
    <ul className="mt-2 space-y-1.5 border-l border-[#7c3aed]/30 pl-2">
      {team.players.map((player) => (
        <li key={player.id}>
          <button
            type="button"
            onClick={() => onPlayer(player)}
            className="flex w-full items-center gap-2.5 rounded-2xl bg-white/[.03] p-2 text-left active:scale-[.99]"
            aria-label={`Ver histórico de ${player.name}`}
          >
            <PlayerImage player={player} size={38} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="truncate text-sm font-semibold text-white">{player.name}</span>
                {player.isShielded && (
                  <span className="shrink-0 text-[10px] text-neutral-500" title="Blindado">
                    🛡
                  </span>
                )}
              </span>
              <span className="block truncate text-[11px] text-neutral-500">
                {player.position} · {player.team} · {player.points} pts
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-bold tabular-nums text-white">
                {millions(player.marketValue)}
              </span>
              {/* Sin clausula publicada se pinta el guion, no un cero. */}
              <span className="block text-[10px] tabular-nums text-neutral-500">
                Cláusula {millions(player.buyoutClause)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-[10px] text-neutral-500">{label}</span>
      <span className="block truncate font-semibold tabular-nums text-neutral-200">{value}</span>
    </span>
  );
}
