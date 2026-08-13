import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import {
  COMPETITION_ID,
  DEFAULT_HEADERS,
  LALIGA_PRIVATE_BASE_URL,
} from "@/src/server/laliga/config";
import { getLeagueSnapshot, getMyLeagues, getMyProfile } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/fantasy/diagnostico/actividad/signos
 *
 * ¿Cuál de los dos tipos de operación resta dinero y cuál lo suma?
 *
 * La actividad de la liga trae `activityTypeId` 31 y 33, ambos con importe y un
 * solo manager. Por la hora se distinguen (31 llega en bloque, a la misma hora
 * para todos: resolución del mercado; 33 a horas sueltas), pero **eso no dice
 * el signo**, y equivocarlo pone el libro de todos del revés.
 *
 * En vez de adivinar, se calibra: **el saldo oficial del usuario conectado es la
 * única caja que LALIGA publica**, y funciona como respuesta conocida. Se prueban
 * las dos hipótesis y se mira cuál reproduce esa cifra.
 *
 *   caja = 100.000.000 − compras + ventas + puntos × 100.000 + recompensas
 *
 * El residuo de la hipótesis correcta debe ser positivo y múltiplo de 100.000:
 * son las recompensas diarias reclamadas. La incorrecta dará un número
 * arbitrario, casi siempre absurdo.
 *
 * Sonda de calibración: se lee, se decide y se borra.
 */

const SALDO_INICIAL = 100_000_000;
const EUROS_POR_PUNTO = 100_000;
const RECOMPENSA_DIARIA = 100_000;

type Entry = {
  activityTypeId?: number;
  amount?: number;
  user1Id?: number | string;
  user2Id?: number | string;
  createdAt?: string;
};

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  try {
    const [me, leagues] = await Promise.all([getMyProfile(auth.token), getMyLeagues(auth.token)]);
    const league = leagues[0];
    if (!league) return privateJson({ error: "Tu cuenta no tiene ninguna liga." }, 404);

    const url = new URL(
      `/api/v1/competition/${COMPETITION_ID}/leagues/${encodeURIComponent(league.id)}/activity`,
      LALIGA_PRIVATE_BASE_URL,
    );
    url.searchParams.set("x-lang", "es");
    const [response, snapshot] = await Promise.all([
      fetch(url.toString(), {
        headers: { ...DEFAULT_HEADERS, Authorization: `Bearer ${auth.token}`, "x-lang": "es" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }),
      getLeagueSnapshot(auth.token, league.id),
    ]);

    const entries = (await response.json()) as Entry[];
    const myTeam = snapshot.teams.find((team) => team.manager.id === me.id);
    if (!myTeam) return privateJson({ error: "No se encontro tu equipo en la liga." }, 404);
    if (myTeam.teamMoney === undefined) {
      return privateJson({ error: "LALIGA no publico tu caja: sin ella no se puede calibrar." }, 409);
    }

    const mine = entries.filter(
      (entry) => String(entry.user1Id) === me.id || String(entry.user2Id) === me.id,
    );
    const sumOf = (type: number) =>
      mine
        .filter((entry) => entry.activityTypeId === type && String(entry.user1Id) === me.id)
        .reduce((total, entry) => total + (entry.amount ?? 0), 0);

    const t31 = sumOf(31);
    const t33 = sumOf(33);

    // Tipo 1: traspaso entre dos managers. Tampoco se sabe la direccion, asi que
    // entra en la calibracion como un termino con dos signos posibles.
    const traspasos = mine.filter((entry) => entry.activityTypeId === 1);
    const traspasoComoUser1 = traspasos
      .filter((entry) => String(entry.user1Id) === me.id)
      .reduce((total, entry) => total + (entry.amount ?? 0), 0);
    const traspasoComoUser2 = traspasos
      .filter((entry) => String(entry.user2Id) === me.id)
      .reduce((total, entry) => total + (entry.amount ?? 0), 0);

    const puntos = myTeam.teamPoints ?? 0;
    const bonusPuntos = puntos * EUROS_POR_PUNTO;
    const oficial = myTeam.teamMoney;

    /** Residuo que quedaria por explicar bajo una hipotesis dada. */
    function probar(nombre: string, compras: number, ventas: number) {
      const reconstruida = SALDO_INICIAL - compras + ventas + bonusPuntos;
      const residuo = oficial - reconstruida;
      return {
        hipotesis: nombre,
        compras,
        ventas,
        cajaReconstruida: reconstruida,
        residuo,
        // Las recompensas diarias son de 100.000 EUR: si el residuo es positivo
        // y multiplo exacto, encaja como "dias reclamados" y la hipotesis vive.
        residuoEsMultiploDe100k: residuo >= 0 && residuo % RECOMPENSA_DIARIA === 0,
        diasDeRecompensaQueExplicarian: residuo >= 0 ? residuo / RECOMPENSA_DIARIA : null,
      };
    }

    const hipotesis = [
      probar("31=COMPRA, 33=VENTA, traspaso: yo pago si soy user1", t31 + traspasoComoUser1, t33 + traspasoComoUser2),
      probar("31=COMPRA, 33=VENTA, traspaso: yo cobro si soy user1", t31 + traspasoComoUser2, t33 + traspasoComoUser1),
      probar("31=VENTA, 33=COMPRA, traspaso: yo pago si soy user1", t33 + traspasoComoUser1, t31 + traspasoComoUser2),
      probar("31=VENTA, 33=COMPRA, traspaso: yo cobro si soy user1", t33 + traspasoComoUser2, t31 + traspasoComoUser1),
    ].sort((a, b) => Math.abs(a.residuo) - Math.abs(b.residuo));

    return privateJson({
      liga: league.name,
      yo: me.name,
      cajaOficial: oficial,
      puntos,
      bonusPuntos,
      misOperaciones: {
        tipo31: mine.filter((e) => e.activityTypeId === 31).length,
        tipo33: mine.filter((e) => e.activityTypeId === 33).length,
        tipo1: traspasos.length,
        sumaTipo31: t31,
        sumaTipo33: t33,
      },
      // La ganadora es la que deja un residuo pequeño, positivo y multiplo de 100k.
      hipotesis,
      comoLeerlo:
        "La hipotesis correcta deja un residuo POSITIVO y multiplo de 100.000 (las recompensas diarias). Las demas daran cifras arbitrarias o negativas.",
    });
  } catch (error) {
    return errorJson(error);
  }
}
