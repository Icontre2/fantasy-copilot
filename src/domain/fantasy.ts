/**
 * Tipos de dominio compartidos entre servidor y cliente.
 *
 * El conector (`src/server/laliga/`) traduce la respuesta cruda de LALIGA a
 * estos tipos, de modo que la UI nunca depende del formato exacto de la API.
 *
 * Regla que atraviesa todo el fichero: un campo opcional (`?`) significa **"la
 * API no siempre lo publica"**, no "todavia no lo hemos rellenado". Cuando algo
 * llega `undefined` la UI debe decir que no se sabe, nunca sustituirlo por 0.
 */

export type Position = 'POR' | 'DEF' | 'MED' | 'DEL';

/** Estado del jugador tal y como lo publica LALIGA Fantasy. */
export type PlayerStatus = 'ok' | 'doubtful' | 'injured' | 'suspended' | 'out_of_league';

export type Team = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  badge: string;
};

export type Manager = {
  id: string;
  name: string;
  avatar: string;
};

export type League = {
  id: string;
  name: string;
  access: string;
  managersNumber: number;
  /** Tu equipo dentro de esta liga, si la respuesta lo incluye. */
  myTeamId?: string;
};

/** Jugador tal y como lo publica LALIGA. Todos los importes en euros. */
export type Player = {
  id: string;
  name: string;
  /** Abreviatura del equipo real (BAR, RMA...). */
  team: string;
  teamId?: string;
  position: Position;
  /** Valor de mercado en euros. */
  marketValue: number;
  points: number;
  averagePoints: number;
  status: PlayerStatus;
  image?: string;
  lastSeasonPoints?: number;
};

/** Jugador dentro de la plantilla de un participante. */
export type SquadPlayer = Player & {
  /** Clausula de rescision en euros. Ausente si la API no la publica. */
  buyoutClause?: number;
  isShielded?: boolean;
  /**
   * Fecha ISO en la que se levanta el blindaje, tal cual la publica LALIGA.
   * Ausente = no la publica: entonces se dice eso, no se estima.
   */
  shieldedUntil?: string;
};

/** Plantilla completa de un participante. */
export type LeagueTeam = {
  teamId: string;
  manager: Manager;
  /** Caja disponible oficial cuando LALIGA la publica; la UI etiqueta cualquier reconstrucción. */
  teamMoney?: number;
  teamValue?: number;
  teamPoints?: number;
  players: SquadPlayer[];
};

/** Una fila de la clasificacion: un participante de la liga. */
export type StandingRow = {
  position: number;
  previousPosition: number;
  points: number;
  livePoints: number;
  teamId: string;
  manager: Manager;
  teamValue?: number;
};

/** Un jugador a la venta en el mercado de la liga. */
export type MarketEntry = {
  /** Id de la entrada de mercado, distinto del id del jugador. */
  marketId: string;
  player: Player;
  /** Precio de salida pedido, en euros. */
  salePrice: number;
  /** Numero de pujas recibidas. Solo visible en vivo. */
  numberOfBids?: number;
  expiresAt?: string;
  /**
   * Quien vende. LALIGA solo identifica al vendedor cuando la venta es de un
   * manager; las entradas del propio sistema no traen `discr` de manager.
   */
  sellerKind: string;
  /** Tu propia puja, si ya has pujado. Las pujas ajenas NO son observables. */
  myBid?: { bidId: string; amount: number };
};

/** Punto del historico diario de cotizacion de un jugador. */
export type MarketValuePoint = {
  date: string;
  /** Valor en euros. */
  marketValue: number;
};

export const POSITIONS: Position[] = ['POR', 'DEF', 'MED', 'DEL'];
