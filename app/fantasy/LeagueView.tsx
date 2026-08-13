"use client";

import { useState } from "react";
import { euros, millions, UNKNOWN } from "./format";
import type { TeamsResponse } from "./types";
import { Card, Empty, SectionTitle, Td, Th, TableWrap } from "./ui";

/**
 * Liga: todos los managers y sus plantillas. Solo lectura.
 *
 * No hay ningun indicador de "compra", "vende" ni "recomendado": esta pantalla
 * enseña lo que publica LALIGA y nada mas.
 */
export function LeagueView({ data }: { data: TeamsResponse }) {
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);

  if (data.teams.length === 0) {
    return <Empty>No se ha podido leer ninguna plantilla de esta liga.</Empty>;
  }

  const byTeamId = new Map(data.teams.map((team) => [team.teamId, team]));
  // Se recorre la clasificacion para conservar el orden oficial de la liga.
  const rows = data.standing.filter((row) => byTeamId.has(row.teamId));

  return (
    <div className="space-y-4">
      {data.failedTeamIds.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No se pudieron leer {data.failedTeamIds.length} plantilla(s). Lo que ves está incompleto.
        </p>
      )}

      <Card>
        <SectionTitle>Participantes</SectionTitle>
        <TableWrap>
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Manager</Th>
                <Th align="right">Puntos</Th>
                <Th align="right">Valor plantilla</Th>
                <Th align="right">Saldo</Th>
                <Th align="right">Jugadores</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const team = byTeamId.get(row.teamId);
                const isOpen = openTeamId === row.teamId;
                return (
                  <tr
                    key={row.teamId}
                    className="cursor-pointer hover:bg-neutral-50"
                    onClick={() => setOpenTeamId(isOpen ? null : row.teamId)}
                  >
                    <Td>{row.position}</Td>
                    <Td className="font-medium">{row.manager.name}</Td>
                    <Td align="right">{row.points}</Td>
                    <Td align="right">{millions(team?.teamValue)}</Td>
                    <Td align="right">{millions(team?.teamMoney)}</Td>
                    <Td align="right">{team?.players.length ?? UNKNOWN}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        <p className="mt-2 text-xs text-neutral-500">
          Toca un manager para ver su plantilla. Todos estos datos los publica LALIGA.
        </p>
      </Card>

      {openTeamId && <SquadCard team={byTeamId.get(openTeamId)} />}
    </div>
  );
}

function SquadCard({ team }: { team: TeamsResponse["teams"][number] | undefined }) {
  if (!team) return null;

  return (
    <Card>
      <SectionTitle>Plantilla de {team.manager.name}</SectionTitle>
      <p className="mb-3 text-sm text-neutral-600">
        Saldo {euros(team.teamMoney)} · Valor {euros(team.teamValue)} · {team.teamPoints ?? UNKNOWN} puntos
      </p>
      <TableWrap>
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <Th>Jugador</Th>
              <Th>Pos</Th>
              <Th>Equipo</Th>
              <Th align="right">Valor</Th>
              <Th align="right">Cláusula</Th>
              <Th align="right">Puntos</Th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((player) => (
              <tr key={player.id}>
                <Td className="font-medium">
                  {player.name}
                  {player.isShielded && (
                    <span className="ml-1 text-xs text-neutral-500" title="Blindado">
                      🛡
                    </span>
                  )}
                </Td>
                <Td>{player.position}</Td>
                <Td>{player.team}</Td>
                <Td align="right">{millions(player.marketValue)}</Td>
                {/* Sin clausula publicada se pinta el guion, no un cero. */}
                <Td align="right">{millions(player.buyoutClause)}</Td>
                <Td align="right">{player.points}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </Card>
  );
}
