"use client";

import { useState } from "react";
import { days, millions, percent, signedMillions, UNKNOWN } from "./format";
import type { AlertsResponse, ClauseAlert } from "./types";
import { Card, DataNotes, Empty, SectionTitle, TableWrap, Td, Th } from "./ui";

/**
 * Alertas de cláusula: jugadores cuyo valor de mercado se acerca a su cláusula.
 *
 * Cada fila separa lo que publica LALIGA (valor, cláusula, propietario) de lo
 * que calcula la app (diferencia, subida diaria, días estimados).
 */

const LEVEL_STYLE: Record<ClauseAlert["level"], string> = {
  CRITICA: "bg-red-100 text-red-900",
  ALTA: "bg-orange-100 text-orange-900",
  MEDIA: "bg-amber-100 text-amber-900",
  INFORMATIVA: "bg-neutral-100 text-neutral-700",
};

const LEVEL_LABEL: Record<ClauseAlert["level"], string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Media",
  INFORMATIVA: "Informativa",
};

/** Por qué no hay estimación de días. Se dice, no se deja el hueco en blanco. */
const MISSING_LABEL: Record<string, string> = {
  sin_historico: "sin histórico suficiente para medir la tendencia",
  historico_desactualizado:
    "su cotización lleva días sin actualizarse: medir una «subida diaria» con ese dato sería presentarlo como actual sin serlo",
  tendencia_no_positiva: "su valor no está subiendo",
  sin_clausula: "LALIGA no publica su cláusula",
};

export function AlertsView({ data }: { data: AlertsResponse }) {
  const [level, setLevel] = useState<ClauseAlert["level"] | "TODAS">("TODAS");

  const visible = level === "TODAS" ? data.alerts : data.alerts.filter((alert) => alert.level === level);

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Alertas de cláusula</SectionTitle>

        <div className="mb-3 flex flex-wrap gap-2">
          {(["TODAS", "CRITICA", "ALTA", "MEDIA", "INFORMATIVA"] as const).map((option) => {
            const count =
              option === "TODAS"
                ? data.alerts.length
                : data.alerts.filter((alert) => alert.level === option).length;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setLevel(option)}
                className={`rounded-full px-3 py-1 text-sm ${
                  level === option ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {option === "TODAS" ? "Todas" : LEVEL_LABEL[option]} ({count})
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <Empty>
            Ningún jugador cumple este criterio ahora mismo. Se han evaluado {data.playersWithClause}{" "}
            jugadores con cláusula publicada.
          </Empty>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <Th>Nivel</Th>
                  <Th>Jugador</Th>
                  <Th>Propietario</Th>
                  <Th align="right">Valor</Th>
                  <Th align="right">Cláusula</Th>
                  <Th align="right">Diferencia</Th>
                  <Th align="right">% de cláusula</Th>
                  <Th align="right">Subida/día</Th>
                  <Th align="right">Días est.</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((alert) => (
                  <tr key={`${alert.owner.teamId}-${alert.player.id}`}>
                    <Td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLE[alert.level]}`}>
                        {LEVEL_LABEL[alert.level]}
                      </span>
                    </Td>
                    <Td className="font-medium">
                      {alert.player.name}
                      <span className="ml-1 text-xs text-neutral-500">
                        {alert.player.position} · {alert.player.team}
                      </span>
                      {alert.official.isShielded && (
                        <span className="ml-1 text-xs" title="Blindado: la cláusula está protegida">
                          🛡
                        </span>
                      )}
                    </Td>
                    <Td>{alert.owner.managerName}</Td>
                    <Td align="right">{millions(alert.official.marketValue)}</Td>
                    <Td align="right">{millions(alert.official.buyoutClause)}</Td>
                    <Td align="right" className={alert.alreadyReachable ? "text-red-700" : ""}>
                      {alert.alreadyReachable ? "ya la supera" : millions(alert.calculated.gap)}
                    </Td>
                    <Td align="right">{percent(alert.calculated.valueToClauseRatio)}</Td>
                    <Td align="right">{signedMillions(alert.calculated.dailyTrend)}</Td>
                    <Td align="right">
                      {alert.calculated.estimatedDays !== null ? (
                        days(alert.calculated.estimatedDays)
                      ) : (
                        <span
                          className="text-neutral-400"
                          title={
                            alert.alreadyReachable
                              ? "El valor ya alcanzó la cláusula"
                              : MISSING_LABEL[alert.calculated.missingReason ?? ""] ?? "sin datos"
                          }
                        >
                          {UNKNOWN}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}

        <p className="mt-3 text-xs text-neutral-500">
          {data.playersWithClause} jugadores con cláusula · {data.playersWithoutClause} sin cláusula
          publicada · {data.skippedForBudget} no consultados por límite de peticiones
          {data.historyFailures > 0 && ` · ${data.historyFailures} sin histórico descargable`}
          {data.staleHistories > 0 && ` · ${data.staleHistories} con cotización congelada`}
        </p>
      </Card>

      <DataNotes notes={data.dataNotes} />
    </div>
  );
}
