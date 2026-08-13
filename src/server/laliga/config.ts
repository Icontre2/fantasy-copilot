/**
 * Configuracion del conector de LALIGA Fantasy.
 *
 * Dos hosts distintos, a proposito:
 *  - publico  (`api-fantasy.llt-services.com`): catalogo y cotizaciones, sin token.
 *  - privado  (`fantasy-api.llt-services.com`): tu liga, requiere Bearer de sesion.
 *
 * Ningun secreto se hardcodea aqui: `clientId` es el identificador publico de la
 * app oficial (viaja en claro en cualquier login) y todo lo demas sale de entorno.
 */

export const LALIGA_PUBLIC_BASE_URL =
  process.env.LALIGA_FANTASY_BASE_URL ?? 'https://api-fantasy.llt-services.com';

/** Host de la temporada 26/27: aqui viven ligas, plantillas y mercado. */
export const LALIGA_PRIVATE_BASE_URL =
  process.env.LALIGA_FANTASY_PRIVATE_BASE_URL ?? 'https://fantasy-api.llt-services.com';

/** Competicion por defecto (1 = LALIGA Fantasy oficial). */
export const COMPETITION_ID = process.env.LALIGA_FANTASY_COMPETITION_ID ?? '1';

/**
 * Login por email + contrasena (Azure AD B2C de LALIGA, flujo Resource Owner
 * Password Credentials). Es el mismo flujo que usa la app movil oficial para el
 * login por email; no funciona con cuentas de Google, Apple o Facebook.
 */
export const AUTH_CONFIG = {
  tokenUrl: 'https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token',
  passwordPolicy: 'B2C_1A_ResourceOwnerv2',
  refreshPolicy: 'B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN',
  clientId: process.env.LALIGA_FANTASY_CLIENT_ID ?? 'af88bcff-1157-40a0-b579-030728aacf0b',
  redirectUri: 'authredirect://com.lfp.laligafantasy',
} as const;

/** Timeout por peticion, en milisegundos. */
export const REQUEST_TIMEOUT_MS = Number(process.env.LALIGA_FANTASY_TIMEOUT_MS ?? 10_000);

/** Cabeceras que la API espera; sin User-Agent responde de forma inconsistente. */
export const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Accept-Language': 'es-ES,es;q=0.9',
  'User-Agent': 'FantasyCopilot/2.0 (+personal-use)',
};
