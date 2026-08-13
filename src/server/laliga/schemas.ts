import { z } from 'zod';

/**
 * Esquemas de las respuestas de LALIGA Fantasy.
 *
 * La API mezcla numeros y strings numericos (`marketValue` llega como string,
 * `points` como number), asi que se normaliza aqui y no en la UI.
 *
 * Todo lo que esta marcado `.optional()` es un campo que la API **no siempre
 * publica**. No se le pone valor por defecto en el schema: el mapper decide, y
 * la decision es siempre dejarlo `undefined` para que la UI pueda decir "no se
 * sabe" en vez de mostrar un cero que parece un dato.
 */

const numeric = z.union([z.number(), z.string()]).transform((value) => Number(value));

// --- Endpoints publicos (sin token) -----------------------------------------

/** GET /api/v3/player/{id}/market-value — serie diaria de cotizacion. */
export const apiMarketValuePointSchema = z.object({
  marketValue: numeric,
  date: z.string(),
  /**
   * Llega SIEMPRE a 0 en el historico (comprobado en el repo de referencia
   * sobre 719 puntos de varios jugadores). No es competencia por el jugador:
   * no se expone al dominio para que nadie lo confunda con una senal.
   */
  bids: numeric.optional(),
});

export const apiMarketValueHistorySchema = z.array(apiMarketValuePointSchema);

// --- Endpoints privados (requieren Bearer de sesion) ------------------------

export const apiManagerSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  managerName: z.string(),
  avatar: z.string().optional(),
});

/** GET /api/v4/user/me */
export const apiUserSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  managerName: z.string(),
  avatar: z.string().optional(),
});

/** GET /api/v1/competition/{c}/leagues */
export const apiLeagueSchema = z.object({
  id: z.string(),
  name: z.string(),
  access: z.string(),
  managersNumber: numeric.optional(),
  team: z
    .object({ id: z.union([z.string(), z.number()]).transform(String) })
    .partial()
    .optional(),
});

export const apiLeaguesSchema = z.array(apiLeagueSchema);

/**
 * `playerMaster`: el jugador anidado que devuelven los endpoints privados
 * (plantillas y mercado). `positionId` llega como numero aqui y como string en
 * el catalogo publico.
 */
export const apiPlayerMasterSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  nickname: z.string(),
  positionId: z.union([z.string(), z.number()]).transform(String),
  playerStatus: z.enum(['ok', 'doubtful', 'injured', 'suspended', 'out_of_league']),
  marketValue: numeric,
  points: numeric,
  averagePoints: numeric,
  lastSeasonPoints: numeric.nullable().optional(),
  images: z.object({ transparent: z.record(z.string(), z.string()).optional() }).partial().optional(),
  team: z.object({ id: z.string(), name: z.string(), slug: z.string().optional() }).partial().optional(),
});

/** Jugador dentro de la plantilla de un participante. */
export const apiTeamPlayerSchema = z.object({
  /**
   * Clausula de rescision. Opcional porque la API no la publica en todos los
   * casos; cuando falta, la alerta de clausula de ese jugador **no se calcula**
   * en vez de asumir un valor.
   */
  buyoutClause: numeric.optional(),
  isShielded: z.boolean().optional(),
  playerMaster: apiPlayerMasterSchema,
});

/** GET /api/v1/competition/{c}/leagues/{id}/teams/{teamId} */
export const apiLeagueTeamSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  /** Caja disponible del manager. Dato oficial y exacto, tambien el de rivales. */
  teamMoney: numeric.nullable().optional(),
  teamValue: numeric.nullable().optional(),
  teamPoints: numeric.nullable().optional(),
  manager: apiManagerSchema,
  players: z.array(apiTeamPlayerSchema),
});

/** Fila de GET /api/v1/competition/{c}/leagues/{id}/standing */
export const apiStandingRowSchema = z.object({
  position: numeric,
  previousPosition: numeric,
  points: numeric,
  livePoints: numeric.optional(),
  team: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    teamValue: numeric.optional(),
    manager: apiManagerSchema,
  }),
});

/** El standing puede llegar como array o envuelto en `elements`. */
export const apiStandingSchema = z.union([
  z.array(apiStandingRowSchema),
  z.object({ elements: z.array(apiStandingRowSchema) }),
]);

/**
 * Puja propia sobre un item del mercado. Solo se ve LA TUYA: LALIGA no publica
 * las pujas de los demas ni en vivo, asi que no existe ningun campo de
 * "puja actual" ni "mejor postor" que leer.
 */
const apiOwnBidSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  money: numeric,
  status: z.string().optional(),
});

/** GET /api/v1/competition/{c}/league/{id}/market */
export const apiMarketItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  /** Discriminador de quien vende (manager vs sistema). */
  discr: z.string(),
  salePrice: numeric,
  expirationDate: z.string().optional(),
  numberOfBids: numeric.optional(),
  playerMaster: apiPlayerMasterSchema,
  bid: apiOwnBidSchema.optional(),
});

export const apiMarketSchema = z.array(apiMarketItemSchema);

/** GET /api/v1/competition/{c}/week/current */
export const apiWeekSchema = z.object({
  isLive: z.boolean(),
  weekNumber: numeric,
  nextWeek: numeric.optional(),
  openingWeekDate: z.string().optional(),
  closingWeekDate: z.string().optional(),
});

export type ApiManagerLike = z.infer<typeof apiManagerSchema>;
export type ApiUser = z.infer<typeof apiUserSchema>;
export type ApiLeague = z.infer<typeof apiLeagueSchema>;
export type ApiLeagueTeam = z.infer<typeof apiLeagueTeamSchema>;
export type ApiTeamPlayer = z.infer<typeof apiTeamPlayerSchema>;
export type ApiStandingRow = z.infer<typeof apiStandingRowSchema>;
export type ApiMarketItem = z.infer<typeof apiMarketItemSchema>;
export type ApiPlayerMaster = z.infer<typeof apiPlayerMasterSchema>;
export type ApiMarketValuePoint = z.infer<typeof apiMarketValuePointSchema>;
export type ApiWeek = z.infer<typeof apiWeekSchema>;
