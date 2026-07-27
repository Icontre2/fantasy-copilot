export type LaligaConnectorStatus =
  | "blocked_by_terms"
  | "mock_only"
  | "private_beta"
  | "authorized";

export type LaligaConnectorState = {
  status: LaligaConnectorStatus;
  title: string;
  detail: string;
  legalSourceUrl: string;
  updatedAt: string;
  automaticSyncAvailable: boolean;
  manualSyncAvailable: boolean;
};

export type LaligaLeagueSummary = {
  externalLeagueId: string;
  name: string;
  balance: number | null;
  squadCount: number;
  marketCount: number;
};

export interface LaligaReadOnlyProvider {
  listLeagues(): Promise<LaligaLeagueSummary[]>;
  getSquad(externalLeagueId: string): Promise<unknown[]>;
  getLineup(externalLeagueId: string): Promise<unknown[]>;
  getMarket(externalLeagueId: string): Promise<unknown[]>;
  disconnect(): Promise<void>;
}

const connectorState: LaligaConnectorState = {
  status: "private_beta",
  title: "Piloto privado disponible",
  detail:
    "El dueño de la cuenta ha autorizado una prueba personal y de solo lectura. No es una integración oficial de LALIGA, no se ofrece a terceros y no incluye operaciones de mercado ni sincronización desatendida.",
  legalSourceUrl:
    "https://www.laliga.com/informacion-legal/condiciones-de-uso-fantasy",
  updatedAt: "2026-07-27",
  automaticSyncAvailable: false,
  manualSyncAvailable: true,
};

export function getLaligaConnectorState(): LaligaConnectorState {
  return connectorState;
}
