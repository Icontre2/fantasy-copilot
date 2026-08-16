import { z } from 'zod';
import type { Team } from '@/src/domain/fantasy';
import { FALLBACK_TEAMS } from '@/src/server/laliga/teams';
import { emparejar } from './match-teams.ts';
import { probabilidades, type CuotasPartido, type Probabilidades } from './implied.ts';

/**
 * Cuotas 1X2 de LALIGA, para saber si el partido de un jugador es un hueso.
 *
 * Fuente: The Odds API. Necesita clave, y la clave sale de `ODDS_API_KEY` — de
 * entorno, nunca del codigo. Sin clave la funcion devuelve `null` y la pantalla
 * dice que las cuotas no estan configuradas: no se inventa ni un numero.
 *
 * El plan gratuito da 500 consultas al mes. Como todos los partidos vienen en
 * UNA respuesta, con pedirla cada pocas horas sobra de largo; por eso hay cache
 * en memoria del proceso.
 */

const BASE = 'https://api.the-odds-api.com/v4/sports/soccer_spain_la_liga/odds';

/** Cada cuanto se vuelve a preguntar. Las cuotas se mueven, pero no por minutos. */
const CACHE_MS = 3 * 60 * 60 * 1000;

const outcomeSchema = z.object({ name: z.string(), price: z.number() });
const marketSchema = z.object({ key: z.string(), outcomes: z.array(outcomeSchema) });
const bookmakerSchema = z.object({
  key: z.string(),
  title: z.string(),
  last_update: z.string().optional(),
  markets: z.array(marketSchema),
});
const eventSchema = z.object({
  id: z.string(),
  commence_time: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  bookmakers: z.array(bookmakerSchema),
});
const oddsSchema = z.array(eventSchema);

export type CuotasDePartido = {
  /** Ids de equipo de LALIGA ya resueltos. */
  localId: string;
  visitorId: string;
  cuotas: CuotasPartido;
  probabilidades: Probabilidades;
  /** Quien publica estas cuotas. Se enseña siempre: es su precio, no el nuestro. */
  casa: string;
  actualizado: string | null;
};

export function hayClaveDeCuotas(): boolean {
  return Boolean(process.env.ODDS_API_KEY);
}

let cache: { at: number; cuotas: CuotasDePartido[] } | null = null;

/**
 * Toma el 1X2 del primer mercado utilizable de la primera casa que lo publique.
 *
 * No se promedian varias casas: la media de precios de sitios distintos no es
 * un precio de nadie, y la pantalla no podria decir de quien es la cuota.
 */
function leerEvento(evento: z.infer<typeof eventSchema>, equipos: Team[]): CuotasDePartido | null {
  const local = emparejar(evento.home_team, equipos);
  const visitante = emparejar(evento.away_team, equipos);
  // Sin identificar a los dos, este partido se queda sin cuotas. Un cruce
  // equivocado enseñaria las cuotas de otro partido sin que se notara.
  if (!local || !visitante || local.id === visitante.id) return null;

  for (const casa of evento.bookmakers) {
    const mercado = casa.markets.find((market) => market.key === 'h2h');
    if (!mercado) continue;

    const precioDe = (nombre: string) =>
      mercado.outcomes.find((outcome) => outcome.name === nombre)?.price;
    const cuotas = {
      local: precioDe(evento.home_team),
      empate: precioDe('Draw'),
      visitante: precioDe(evento.away_team),
    };
    if (cuotas.local === undefined || cuotas.empate === undefined || cuotas.visitante === undefined) {
      continue;
    }

    const probs = probabilidades(cuotas as CuotasPartido);
    if (!probs) continue;

    return {
      localId: local.id,
      visitorId: visitante.id,
      cuotas: cuotas as CuotasPartido,
      probabilidades: probs,
      casa: casa.title,
      actualizado: casa.last_update ?? null,
    };
  }
  return null;
}

/**
 * Cuotas de todos los partidos de LALIGA que la casa tenga abiertos.
 *
 * `null` significa "no configurado o no disponible", que la pantalla distingue
 * de "este partido no tiene cuotas".
 */
export async function getCuotas(): Promise<CuotasDePartido[] | null> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return null;

  if (cache && Date.now() - cache.at < CACHE_MS) return cache.cuotas;

  const url = new URL(BASE);
  url.searchParams.set('regions', process.env.ODDS_API_REGIONS ?? 'eu');
  url.searchParams.set('markets', 'h2h');
  url.searchParams.set('oddsFormat', 'decimal');
  url.searchParams.set('apiKey', apiKey);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const parsed = oddsSchema.safeParse(await response.json());
    if (!parsed.success) return null;

    const equipos = Object.values(FALLBACK_TEAMS);
    const cuotas = parsed.data
      .map((evento) => leerEvento(evento, equipos))
      .filter((entrada): entrada is CuotasDePartido => entrada !== null);

    cache = { at: Date.now(), cuotas };
    return cuotas;
  } catch {
    // Que se caiga la casa de apuestas no puede tumbar el calendario.
    return null;
  }
}
