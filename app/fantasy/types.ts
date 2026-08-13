/** Formas que devuelven las rutas `/api/fantasy/*`, tal cual las consume la UI. */

import type { League, LeagueTeam, Manager, MarketEntry, MarketValuePoint, Player, StandingRow } from "@/src/domain/fantasy";
import type { ClauseAlert } from "@/src/server/laliga/alerts/clause-alerts";
import type { ManagerLedger } from "@/src/server/laliga/economy/ledger";

export type { ClauseAlert, League, LeagueTeam, Manager, ManagerLedger, MarketEntry, MarketValuePoint, Player, StandingRow };

export type LeaguesResponse = { leagues: League[] };

export type TeamsResponse = {
  standing: StandingRow[];
  teams: LeagueTeam[];
  failedTeamIds: string[];
};

export type MarketResponse = { market: MarketEntry[] };

export type PlayerWithProbability = Player & {
  buyoutClause?: number;
  isShielded?: boolean;
  lineupProbability?: number;
};

export type DashboardResponse = {
  league: Pick<League, 'id' | 'name'>;
  me: LeagueTeam & {
    players: PlayerWithProbability[];
    position?: number;
    points?: number;
    netWorth: number;
  };
  lineup: {
    formation: string;
    starters: PlayerWithProbability[];
    bench: PlayerWithProbability[];
  };
  competitors: Array<{
    teamId: string;
    manager: Manager;
    position?: number;
    points?: number;
    teamValue?: number;
    teamMoney?: number;
    netWorth: number;
  }>;
  failedTeamIds: string[];
};

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

export type Section = "inicio" | "plantilla" | "liga" | "alertas" | "economia" | "mercado" | "onces" | "comparar" | "exportar" | "mas";

export const SECTIONS: { id: Section; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "plantilla", label: "Plantilla" },
  { id: "mercado", label: "Mercado" },
  { id: "mas", label: "Más" },
];
