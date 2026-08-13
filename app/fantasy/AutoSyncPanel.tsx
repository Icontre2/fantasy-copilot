"use client";

import { useState } from "react";
import type { ScheduleStatus } from "./types";
import { del, post } from "./api";
import { ErrorBox } from "./ui";

/**
 * Sincronización automática de una liga.
 *
 * Por qué merece sitio propio en la pantalla: el desglose económico solo puede
 * atribuir un importe a un jugador cuando el manager hizo UNA operación entre
 * dos fotos. Si nadie sincroniza durante un día entero, el dinero total sigue
 * cuadrando pero el desglose de ese día se pierde. Que esto esté encendido o
 * apagado cambia la calidad del dato, así que se muestra junto a las cifras en
 * vez de esconderse en una pantalla de ajustes.
 *
 * El diagnóstico (`health`, `message`) lo calcula el servidor y llega dentro de
 * la respuesta de economía. Aquí solo se pinta: si la UI reconstruyera el
 * criterio, acabaría discrepando del backend.
 */

/** Colores por estado. STOPPED y LATE no pueden pasar desapercibidos. */
const TONE: Record<ScheduleStatus["health"], string> = {
  OFF: "border-neutral-200 bg-neutral-50 text-neutral-700",
  PENDING: "border-sky-200 bg-sky-50 text-sky-900",
  OK: "border-green-200 bg-green-50 text-green-900",
  LATE: "border-amber-200 bg-amber-50 text-amber-900",
  STOPPED: "border-red-200 bg-red-50 text-red-900",
};

const LABEL: Record<ScheduleStatus["health"], string> = {
  OFF: "Desactivada",
  PENDING: "Activada",
  OK: "Al día",
  LATE: "Con retraso",
  STOPPED: "Parada",
};

export function AutoSyncPanel({
  leagueId,
  status,
  onChanged,
}: {
  leagueId: string;
  status: ScheduleStatus;
  /** Recarga la economía: el estado nuevo llega dentro de esa misma respuesta. */
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const path = `/api/fantasy/leagues/${leagueId}/economy/schedule`;
    try {
      if (status.subscription?.enabled) await del<ScheduleStatus>(path);
      else await post<ScheduleStatus>(path, {});
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar la sincronización.");
    } finally {
      setBusy(false);
    }
  }

  const enabled = status.subscription?.enabled ?? false;

  return (
    <div className={`rounded-lg border p-3 text-sm ${TONE[status.health]}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">Sincronización automática · {LABEL[status.health]}</span>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="rounded-lg border border-current px-2 py-1 text-xs font-medium disabled:opacity-50"
        >
          {busy ? "Guardando…" : enabled ? "Desactivar" : "Activar"}
        </button>
      </div>

      <p className="mt-2">{status.message}</p>

      {status.subscription?.lastError && status.health !== "STOPPED" && (
        <p className="mt-1 text-xs opacity-80">Último error: {status.subscription.lastError}</p>
      )}

      {error && <div className="mt-2"><ErrorBox message={error} /></div>}
    </div>
  );
}
