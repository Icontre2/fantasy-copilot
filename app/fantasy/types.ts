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
  failedTeamIds: string[];
  dataNotes: string[];
};

export type EconomyResponse = {
  leagueId: string;
  trackedSince: string | null;
  ledgers: ManagerLedger[];
  dataNotes: string[];
};

export type SyncResponse = {
  capturedAt: string;
  hadPreviousSnapshot: boolean;
  detectedTransactions: number;
  storedTransactions: number;
  pointIncomeRows: number;
};

export type Section = "liga" | "alertas" | "economia" | "mercado" | "exportar";

export const SECTIONS: { id: Section; label: string }[] = [
  { id: "liga", label: "Liga" },
  { id: "alertas", label: "Alertas" },
  { id: "economia", label: "Economía" },
  { id: "mercado", label: "Mercado" },
  { id: "exportar", label: "Exportar" },
];
