export type LaligaConnectorStatus =
  | "blocked_by_terms"
  | "mock_only"
  | "authorized";

export type LaligaConnectorState = {
  status: LaligaConnectorStatus;
  title: string;
  detail: string;
  legalSourceUrl: string;
  updatedAt: string;
  automaticSyncAvailable: boolean;
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
  status: "blocked_by_terms",
  title: "Conexión automática pendiente de autorización",
  detail:
    "Las condiciones vigentes limitan el juego al uso personal y privado, prohíben el uso comercial sin consentimiento escrito y exigen mantener los identificadores en secreto. Fantasy Copilot no solicitará credenciales mientras no exista permiso expreso de LALIGA.",
  legalSourceUrl:
    "https://www.laliga.com/informacion-legal/condiciones-de-uso-fantasy",
  updatedAt: "2026-07-26",
  automaticSyncAvailable: false,
};

export function getLaligaConnectorState(): LaligaConnectorState {
  return connectorState;
}
