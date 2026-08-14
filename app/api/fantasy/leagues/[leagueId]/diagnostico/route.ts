import { z } from "zod";
import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { privateFetch } from "@/src/server/laliga/client";
import { COMPETITION_ID } from "@/src/server/laliga/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/fantasy/leagues/{leagueId}/diagnostico
 *
 * SONDA TEMPORAL. Se lee una vez y se borra.
 *
 * Existe porque el dinero no aparece en ninguna pantalla y desde el servidor no
 * se puede saber por qué: los esquemas de Zod DESCARTAN las claves que no
 * declaran, así que si LALIGA renombra un campo, aguas abajo solo se ve un
 * `undefined` mudo. Justo eso acaba de pasar con el equipo del jugador, que
 * llega como `teamId` plano donde el esquema esperaba `team.id`.
 *
 * Por eso aquí NO se valida nada: se lee el JSON tal cual y se informa de qué
 * claves trae de verdad. Devuelve nombres de claves y los importes del propio
 * usuario —que son suyos—, nunca el token ni cabeceras.
 */

/** Acepta lo que sea: la gracia de esta ruta es ver lo que no esperábamos. */
const CUALQUIER_COSA = z.unknown();

/** Claves que podrían contener dinero, para ver cuál existe realmente. */
const PISTAS_DINERO = ["money", "cash", "saldo", "balance", "budget", "funds"];

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Claves de un objeto cuyo nombre suena a dinero, con su valor. */
function clavesDeDinero(objeto: Record<string, unknown>): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(objeto)) {
    if (PISTAS_DINERO.some((pista) => clave.toLowerCase().includes(pista))) salida[clave] = valor;
  }
  return salida;
}

export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;
  const base = `/api/v1/competition/${COMPETITION_ID}/leagues/${encodeURIComponent(leagueId)}`;

  try {
    const fallo = (error: unknown) => ({ fallo: error instanceof Error ? error.message : String(error) });
    const [equipos, actividad, ligas] = await Promise.all([
      privateFetch<unknown>(`${base}/teams`, auth.token, CUALQUIER_COSA).catch(fallo),
      privateFetch<unknown>(`${base}/activity?limit=500`, auth.token, CUALQUIER_COSA).catch(fallo),
      // De aqui sale cual es TU equipo, que es el unico del que LALIGA publica caja.
      privateFetch<unknown>(`/api/v1/competition/${COMPETITION_ID}/leagues`, auth.token, CUALQUIER_COSA).catch(fallo),
    ]);

    /*
     * Tu propio equipo, pedido POR SEPARADO.
     *
     * No es redundante: la app lee la caja del listado plural, y puede que
     * LALIGA solo la mande en el endpoint individual. Si aqui aparece dinero y
     * arriba no, ese es exactamente el fallo.
     */
    const miLiga = (Array.isArray(ligas) ? ligas : []).filter(esObjeto)
      .find((liga) => String(liga.id) === String(leagueId));
    const miEquipoId = miLiga && esObjeto(miLiga.team) ? miLiga.team.id : undefined;
    const miEquipo = miEquipoId
      ? await privateFetch<unknown>(`${base}/teams/${encodeURIComponent(String(miEquipoId))}`, auth.token, CUALQUIER_COSA).catch(fallo)
      : null;

    const listaEquipos = Array.isArray(equipos) ? equipos : [];
    const listaActividad = Array.isArray(actividad) ? actividad : [];

    return privateJson({
      leyenda:
        "Sonda temporal. 'clavesDeDinero' son los campos que LALIGA manda de verdad para cada equipo; si sale {} es que no manda ninguno con ese nombre.",

      miEquipo: {
        teamId: miEquipoId ?? null,
        // Lo importante: si el endpoint individual SI trae caja y el plural no.
        clavesDeDinero: esObjeto(miEquipo) ? clavesDeDinero(miEquipo) : null,
        claves: esObjeto(miEquipo) ? Object.keys(miEquipo).sort() : null,
      },

      equipos: {
        cuantos: listaEquipos.length,
        fallo: esObjeto(equipos) ? (equipos.fallo ?? null) : null,
        // Todas las claves del primer equipo: así se ve si algo se ha renombrado.
        clavesDelPrimero: esObjeto(listaEquipos[0]) ? Object.keys(listaEquipos[0]).sort() : null,
        porManager: listaEquipos.filter(esObjeto).map((equipo) => ({
          manager: esObjeto(equipo.manager) ? equipo.manager.managerName : null,
          clavesDeDinero: clavesDeDinero(equipo),
          teamValue: equipo.teamValue ?? null,
          jugadores: Array.isArray(equipo.players) ? equipo.players.length : null,
        })),
        // Un jugador entero, para ver si el equipo viene plano o anidado.
        unJugador: (() => {
          const primero = listaEquipos.find(esObjeto);
          const jugadores = primero && Array.isArray(primero.players) ? primero.players : [];
          const jugador = jugadores.find(esObjeto);
          if (!jugador) return null;
          return {
            clavesDelJugador: Object.keys(jugador).sort(),
            clavesDelPlayerMaster: esObjeto(jugador.playerMaster)
              ? Object.keys(jugador.playerMaster).sort()
              : null,
            teamAnidado: esObjeto(jugador.playerMaster) ? (jugador.playerMaster.team ?? null) : null,
            teamIdPlano: esObjeto(jugador.playerMaster) ? (jugador.playerMaster.teamId ?? null) : null,
          };
        })(),
      },

      actividad: {
        cuantas: listaActividad.length,
        fallo: esObjeto(actividad) ? (actividad.fallo ?? null) : null,
        clavesDeUna: esObjeto(listaActividad[0]) ? Object.keys(listaActividad[0]).sort() : null,
        // Cuántas de cada tipo: si sale vacío, es que no llega actividad.
        tipos: listaActividad.filter(esObjeto).reduce<Record<string, number>>((cuenta, entrada) => {
          const tipo = String(entrada.activityTypeId ?? "sin-tipo");
          cuenta[tipo] = (cuenta[tipo] ?? 0) + 1;
          return cuenta;
        }, {}),
        primeras: listaActividad.slice(0, 3),
      },
    });
  } catch (error) {
    return errorJson(error);
  }
}
