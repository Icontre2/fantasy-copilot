import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import {
  COMPETITION_ID,
  DEFAULT_HEADERS,
  LALIGA_PRIVATE_BASE_URL,
} from "@/src/server/laliga/config";
import { getLeagueSnapshot, getMyLeagues } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/fantasy/diagnostico/actividad/tipos
 *
 * Segunda sonda sobre `/leagues/{id}/activity`, que SÍ existe y trae `amount`
 * con el importe real (verificado en una liga real: 65 entradas).
 *
 * Falta lo único que impide usarlo: **qué significa cada `activityTypeId`**.
 * Sin eso no se puede saber si una entrada es una compra al mercado, una venta,
 * una cláusula pagada o un traspaso entre managers — y de esa distinción depende
 * el signo del apunte en el libro de cada uno.
 *
 * No se inventa el catálogo: se agrupa lo observado y se muestran ejemplos
 * reales, con el nombre del manager resuelto para poder interpretarlos a ojo.
 * También comprueba hasta dónde llega el histórico y si admite paginación, que
 * decide si el ledger puede arrancar el 4 de agosto o solo desde hoy.
 */

type ActivityEntry = Record<string, unknown> & {
  activityTypeId?: number;
  createdAt?: string;
  amount?: number;
  user1Id?: number | string;
  user2Id?: number | string;
};

async function fetchActivity(token: string, leagueId: string, query = ""): Promise<unknown> {
  const url = new URL(
    `/api/v1/competition/${COMPETITION_ID}/leagues/${encodeURIComponent(leagueId)}/activity${query}`,
    LALIGA_PRIVATE_BASE_URL,
  );
  url.searchParams.set("x-lang", "es");
  const response = await fetch(url.toString(), {
    headers: { ...DEFAULT_HEADERS, Authorization: `Bearer ${token}`, "x-lang": "es" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return { estado: response.status };
  return response.json().catch(() => null);
}

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  try {
    const leagues = await getMyLeagues(auth.token);
    const league = leagues[0];
    if (!league) return privateJson({ error: "Tu cuenta no tiene ninguna liga." }, 404);

    const [raw, snapshot] = await Promise.all([
      fetchActivity(auth.token, league.id),
      getLeagueSnapshot(auth.token, league.id),
    ]);

    if (!Array.isArray(raw)) return privateJson({ error: "La actividad no llego como lista.", raw });
    const entries = raw as ActivityEntry[];

    // Nombre por managerId, para poder leer los ejemplos sin descifrar ids.
    const nameById = new Map<string, string>(
      snapshot.teams.map((team) => [String(team.manager.id), team.manager.name]),
    );
    const naming = (value: unknown) =>
      value === undefined || value === null ? null : nameById.get(String(value)) ?? `id:${value}`;

    // Agrupado por tipo, con ejemplos reales para poder deducir que es cada uno.
    const byType = new Map<number, ActivityEntry[]>();
    for (const entry of entries) {
      const type = Number(entry.activityTypeId ?? -1);
      const list = byType.get(type) ?? [];
      list.push(entry);
      byType.set(type, list);
    }

    const fechas = entries
      .map((entry) => String(entry.createdAt ?? ""))
      .filter(Boolean)
      .sort();

    // ¿Hay mas historico del que devuelve por defecto?
    const conPaginacion = await fetchActivity(auth.token, league.id, "?limit=500&offset=0");

    return privateJson({
      liga: league.name,
      totalEntradas: entries.length,
      masAntigua: fechas[0] ?? null,
      masReciente: fechas.at(-1) ?? null,
      // Si con limit=500 llegan mas, el historico esta paginado y se puede ir a por el.
      conLimit500: Array.isArray(conPaginacion) ? conPaginacion.length : conPaginacion,
      clavesVistas: [...new Set(entries.flatMap((entry) => Object.keys(entry)))].sort(),
      tipos: [...byType.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([tipo, lista]) => ({
          activityTypeId: tipo,
          veces: lista.length,
          conImporte: lista.filter((entry) => typeof entry.amount === "number").length,
          conSegundoUsuario: lista.filter((entry) => entry.user2Id !== undefined && entry.user2Id !== null).length,
          ejemplos: lista.slice(0, 3).map((entry) => ({
            ...entry,
            _user1: naming(entry.user1Id),
            _user2: naming(entry.user2Id),
          })),
        })),
    });
  } catch (error) {
    return errorJson(error);
  }
}
