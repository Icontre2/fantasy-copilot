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

/** GET /api/v5/players — catálogo público completo. */
export const apiPlayerSchema = z.object({
  id: z.string(),
  positionId: z.string(),
  nickname: z.string(),
  playerStatus: z.enum(['ok', 'doubtful', 'injured', 'suspended', 'out_of_league']),
  marketValue: numeric,
  points: numeric,
  averagePoints: numeric,
  image: z.string(),
  teamId: z.string(),
  lastSeasonPoints: numeric.optional(),
  weekPoints: z.array(z.unknown()).optional(),
});

export const apiPlayersSchema = z.array(apiPlayerSchema);

export const apiMarketValuePointSchema = z.object({
  marketValue: numeric,
  date: z.string(),
  bids: numeric.optional(),
});

export const apiMarketValueHistorySchema = z.array(apiMarketValuePointSchema);

/**
 * Manager de liga. `passthrough()` es intencionado: LALIGA ha usado variantes
 * de campo para la foto de perfil según endpoint/version. Si se eliminan los
 * campos desconocidos aquí, el mapper nunca puede recuperar la foto real de los
 * rivales aunque venga en la respuesta.
 */
export const apiManagerSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  managerName: z.string(),
  avatar: z.string().optional(),
}).passthrough();

/** GET /api/v4/user/me */
export const apiUserSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  managerName: z.string(),
  avatar: z.string().optional(),
}).passthrough();

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
  teamId: z.union([z.string(), z.number()]).transform(String).optional(),
});

export const apiTeamPlayerSchema = z.object({
  buyoutClause: numeric.optional(),
  isShielded: z.boolean().optional(),
  buyoutClauseLockedEndTime: z.string().optional(),
  playerMaster: apiPlayerMasterSchema,
});

export const apiLeagueTeamSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  teamMoney: numeric.nullable().optional(),
  teamValue: numeric.nullable().optional(),
  teamPoints: numeric.nullable().optional(),
  manager: apiManagerSchema,
  players: z.array(apiTeamPlayerSchema),
});

export const apiLeagueTeamsSchema = z.array(apiLeagueTeamSchema);

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

export const apiStandingSchema = z.union([
  z.array(apiStandingRowSchema),
  z.object({ elements: z.array(apiStandingRowSchema) }),
]);

const apiOwnBidSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  money: numeric,
  status: z.string().optional(),
});

export const apiMarketItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  discr: z.string(),
  salePrice: numeric,
  expirationDate: z.string().optional(),
  numberOfBids: numeric.optional(),
  playerMaster: apiPlayerMasterSchema,
  bid: apiOwnBidSchema.optional(),
});

export const apiMarketSchema = z.array(apiMarketItemSchema);

export const apiWeekSchema = z.object({
  isLive: z.boolean(),
  weekNumber: numeric,
  nextWeek: numeric.optional(),
  openingWeekDate: z.string().optional(),
  closingWeekDate: z.string().optional(),
});

export const apiMatchSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  matchDate: z.string(),
  localId: z.union([z.string(), z.number()]).transform(String),
  visitorId: z.union([z.string(), z.number()]).transform(String),
  localScore: numeric.nullable().optional(),
  visitorScore: numeric.nullable().optional(),
});

export const apiCalendarSchema = z.array(apiMatchSchema);

export type ApiMatch = z.infer<typeof apiMatchSchema>;
export type ApiManagerLike = z.infer<typeof apiManagerSchema>;
export type ApiPlayer = z.infer<typeof apiPlayerSchema>;
export type ApiUser = z.infer<typeof apiUserSchema>;
export type ApiLeague = z.infer<typeof apiLeagueSchema>;
export type ApiLeagueTeam = z.infer<typeof apiLeagueTeamSchema>;
export type ApiTeamPlayer = z.infer<typeof apiTeamPlayerSchema>;
export type ApiStandingRow = z.infer<typeof apiStandingRowSchema>;
export type ApiMarketItem = z.infer<typeof apiMarketItemSchema>;
export type ApiPlayerMaster = z.infer<typeof apiPlayerMasterSchema>;
export type ApiMarketValuePoint = z.infer<typeof apiMarketValuePointSchema>;
export type ApiWeek = z.infer<typeof apiWeekSchema>;

export const apiActivityEntrySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  activityTypeId: numeric,
  user1Id: z.union([z.string(), z.number()]).transform(String).optional(),
  user2Id: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
  playerMasterId: z.union([z.string(), z.number()]).transform(String).optional(),
  amount: numeric.optional(),
  createdAt: z.string(),
});

export const apiActivitySchema = z.array(apiActivityEntrySchema);
