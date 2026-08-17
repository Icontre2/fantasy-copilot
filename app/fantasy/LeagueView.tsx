"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { millions, UNKNOWN } from "./format";
import type { TeamsResponse } from "./types";
import { Card, Empty, SectionTitle, Spinner } from "./ui";
import { Pitch } from "./Pitch";
import { get } from "./api";
import type { PlayerWithProbability } from "./types";
import { PlayerDetails } from "./PlayerDetails";
import type { Player } from "./types";
import { SquadValueHistory } from "./SquadValueHistory";

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
/** Lo que devuelve la ruta del once de un rival. */
type RivalLineup = {
  teamId: string;
  lineup: { formation: string; starters: PlayerWithProbability[]; bench: PlayerWithProbability[] };
};

export function LeagueView({ data, leagueId }: { data: TeamsResponse; leagueId: string }) {
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

                {isOpen && team && (
                  <>
                    <OnceDelRival leagueId={leagueId} team={team} onPlayer={setSelectedPlayer} />
                    <div className="mt-3">
                      <SquadValueHistory
                        leagueId={leagueId}
                        teamId={team.teamId}
                        players={team.players}
                        title={`Plantilla de ${team.manager.name}`}
                        onPlayer={setSelectedPlayer}
                      />
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs leading-4 text-neutral-500">
          Toca un manager para ver su once más probable, y desde ahí su plantilla entera. Valor y
          jugadores los publica LALIGA; la caja, solo la de tu propio equipo.
        </p>
      </Card>

      {selectedPlayer && <PlayerDetails player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}

/**
 * Once probable de un rival.
 *
 * Se pide al abrirlo y no con el resto de la pantalla: calcularlo exige leer la
 * alineación probable de los doce clubes de ESE manager, y hacerlo para los ocho
 * a la vez sería descargar veinte páginas antes de enseñar nada.
 */
function OnceDelRival({
  leagueId,
  team,
  onPlayer,
}: {
  leagueId: string;
  team: TeamsResponse["teams"][number];
  onPlayer: (player: Player) => void;
}) {
  const [data, setData] = useState<RivalLineup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    get<RivalLineup>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/teams/${encodeURIComponent(team.teamId)}/lineup`)
      .then((respuesta) => { if (!cancelado) setData(respuesta); })
      .catch((caught: unknown) => {
        if (!cancelado) setError(caught instanceof Error ? caught.message : "No se pudo calcular su once.");
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [leagueId, team.teamId]);

  if (cargando) return <Spinner label={`Montando el once de ${team.manager.name}…`} />;
  // Que falle el once no debe esconder la plantilla, que ya la tenemos.
  if (error || !data) return <p className="mt-2 rounded-2xl bg-white/[.03] p-3 text-xs leading-4 text-neutral-500">{error ?? "Sin once probable."}</p>;

  return (
    <div className="mt-2">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-400">Once probable</p>
        <p className="text-sm font-bold text-white">{data.lineup.formation}</p>
      </div>
      {/* `jornada` va a `null`: los puntos por jornada se enseñan en tu propia
          pantalla, donde consta cuál es la jornada en curso. */}
      <Pitch starters={data.lineup.starters} jornada={null} onSelect={onPlayer} />
      <p className="mt-2 text-[11px] leading-4 text-neutral-500">
        Calculado con los porcentajes de FútbolFantasy. <strong>No es su alineación real</strong>:
        LALIGA no publica las alineaciones ajenas.
      </p>
    </div>
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
