/** Formas que devuelven las rutas `/api/fantasy/*`, tal cual las consume la UI. */

import type { League, LeagueTeam, Manager, MarketEntry, MarketValuePoint, Player, StandingRow } from "@/src/domain/fantasy";
import type { ClauseAlert } from "@/src/server/laliga/alerts/clause-alerts";
import type { ManagerEconomy } from "@/src/server/laliga/economy/activity";
import type { DiagnosticoDeSesion } from "@/src/server/laliga/session-mode";
import type { Proveedor } from "@/src/server/auth/providers";

export type { ClauseAlert, DiagnosticoDeSesion, League, LeagueTeam, Manager, ManagerEconomy, MarketEntry, MarketValuePoint, Player, Proveedor, StandingRow };

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
  /** FútbolFantasy lo incluye en su once, aunque todavía no publique porcentaje. */
  lineupExpectedStarter?: boolean;
};

export type DashboardResponse = {
  league: Pick<League, 'id' | 'name'>;
  /** Jornada en curso; `null` si LALIGA no la publica en este momento. */
  currentWeek: number | null;
  weekIsLive: boolean;
  me: LeagueTeam & {
    players: PlayerWithProbability[];
    position?: number;
    points?: number;
    /** `null` cuando LALIGA no publica la caja: no se rellena con el valor de plantilla. */
    netWorth: number | null;
    cashSource: "OFICIAL" | "NO_PUBLICADA";
    knownCashFlow: number;
    /** `100 M€ + flujo conocido`. Respaldo si no existe caja oficial. */
    estimatedCash: number;
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
    /** Patrimonio con caja oficial propia o caja rival reconstruida. */
    netWorth: number | null;
    cashSource: "OFICIAL" | "NO_PUBLICADA";
    knownCashFlow: number;
    /** `100 M€ + flujo conocido`. Estimación, no dato. */
    estimatedCash: number;
  }>;
  failedTeamIds: string[];
  activityFrom: string | null;
};

export type AlertsResponse = {
  leagueId: string;
  myManagerId: string;
  myTeamMoney: number | null;
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
  saldoInicial: number;
  /** Fecha de la operación más antigua que publica LALIGA. */
  actividadDesde: string | null;
  actividadHasta: string | null;
  operaciones: number;
  economies: ManagerEconomy[];
  dataNotes: string[];
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

export type Section = "inicio" | "plantilla" | "liga" | "alertas" | "economia" | "mercado" | "onces" | "comparar" | "exportar" | "jornadas" | "mas";

export const SECTIONS: { id: Section; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "plantilla", label: "Plantilla" },
  { id: "mercado", label: "Mercado" },
  { id: "alertas", label: "Alertas" },
  { id: "mas", label: "Más" },
];
