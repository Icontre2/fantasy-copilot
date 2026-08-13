/** Formas que devuelven las rutas `/api/fantasy/*`, tal cual las consume la UI. */

import type { League, LeagueTeam, Manager, MarketEntry, StandingRow } from "@/src/domain/fantasy";
import type { ClauseAlert } from "@/src/server/laliga/alerts/clause-alerts";
import type { ManagerLedger } from "@/src/server/laliga/economy/ledger";

export type { ClauseAlert, League, LeagueTeam, Manager, ManagerLedger, MarketEntry, StandingRow };

export type LeaguesResponse = { leagues: League[] };

export type TeamsResponse = {
  standing: StandingRow[];
  teams: LeagueTeam[];
  failedTeamIds: string[];
};

export type MarketResponse = { market: MarketEntry[] };

export type AlertsResponse = {
  leagueId: string;
  alerts: ClauseAlert[];
  playersWithClause: number;
  playersWithoutClause: number;
  skippedForBudget: number;
  historyFailures: number;
  /** Con histórico, pero congelado: alertan por cercanía, sin tendencia. */
  staleHistories: number;
  failedTeamIds: string[];
  dataNotes: string[];
};

export type EconomyResponse = {
  leagueId: string;
  trackedSince: string | null;
  ledgers: ManagerLedger[];
  dataNotes: string[];
  /** Estado de la sincronizacion automatica; llega en la misma respuesta. */
  schedule?: ScheduleStatus;
  /** `true` cuando falta base de datos: sin ella no hay histórico que mostrar. */
  storageRequired?: boolean;
};

export type SyncResponse = {
  capturedAt: string;
  hadPreviousSnapshot: boolean;
  detectedTransactions: number;
  storedTransactions: number;
  pointIncomeRows: number;
};

/** Estado de la sincronizacion automatica. Lo diagnostica el servidor, no la UI. */
export type ScheduleStatus = {
  subscription: {
    leagueId: string;
    leagueName: string | null;
    enabled: boolean;
    lastRunAt: string | null;
    lastStatus: "OK" | "SESSION_EXPIRED" | "ERROR" | null;
    lastError: string | null;
    lastDetectedTransactions: number | null;
    consecutiveFailures: number;
  } | null;
  health: "OFF" | "PENDING" | "OK" | "LATE" | "STOPPED";
  minutesSinceLastRun: number | null;
  message: string;
};

export type Section = "liga" | "alertas" | "economia" | "mercado" | "exportar";

export const SECTIONS: { id: Section; label: string }[] = [
  { id: "liga", label: "Liga" },
  { id: "alertas", label: "Alertas" },
  { id: "economia", label: "Economía" },
  { id: "mercado", label: "Mercado" },
  { id: "exportar", label: "Exportar" },
];
