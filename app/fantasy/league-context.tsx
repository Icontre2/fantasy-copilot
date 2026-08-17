"use client";

import { createContext, useContext } from "react";

/**
 * En qué liga estamos, para quien lo necesite abajo del todo.
 *
 * Existe por la ficha del jugador: se abre desde seis pantallas distintas y
 * necesita la liga para preguntar de quién es el jugador. Pasarla por props
 * serían seis sitios que tocar y seis sitios donde olvidarse el día que se abra
 * desde un séptimo.
 *
 * Solo lleva el identificador. Un contexto que empieza a llevar «todo lo de la
 * liga» acaba haciendo que cualquier cambio repinte la app entera.
 */
const LigaContext = createContext<string | null>(null);

export function LigaProvider({ leagueId, children }: { leagueId: string; children: React.ReactNode }) {
  return <LigaContext.Provider value={leagueId}>{children}</LigaContext.Provider>;
}

/** La liga actual, o `null` fuera del proveedor. Quien lo use debe aguantar el `null`. */
export function useLeagueId(): string | null {
  return useContext(LigaContext);
}
