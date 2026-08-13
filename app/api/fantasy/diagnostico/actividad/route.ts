import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import {
  COMPETITION_ID,
  DEFAULT_HEADERS,
  LALIGA_PRIVATE_BASE_URL,
} from "@/src/server/laliga/config";
import { getMyLeagues } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/fantasy/diagnostico/actividad
 *
 * Sonda de exploración: ¿existe un endpoint de «Actividad» con las compras y
 * ventas de la liga, y publica los precios?
 *
 * Todo el diseño de Economía asume hoy que **no** existe historial de
 * operaciones: por eso los importes se infieren de la variación de caja y solo
 * son atribuibles cuando el manager hizo una única operación entre dos fotos.
 * Si este endpoint existe y trae precios, esa limitación desaparece y el ledger
 * pasa a apoyarse en datos publicados en vez de en deducciones.
 *
 * De paso comprueba si algún endpoint publica el saldo de TODOS los managers:
 * `/teams/{id}` solo devuelve el del usuario conectado (medido sobre una liga
 * real de 8 participantes), y conviene descartar que exista en otro sitio antes
 * de dar la contabilidad ajena por imposible.
 *
 * Es una sonda, no una funcionalidad: se lee y se borra. Solo hace GET.
 */

/** Rutas candidatas, relativas al host privado. `{c}` y `{l}` se sustituyen. */
const CANDIDATES = [
  "/api/v1/competition/{c}/leagues/{l}/news",
  "/api/v1/competition/{c}/leagues/{l}/activity",
  "/api/v1/competition/{c}/leagues/{l}/movements",
  "/api/v1/competition/{c}/leagues/{l}/timeline",
  "/api/v1/competition/{c}/leagues/{l}/operations",
  "/api/v1/competition/{c}/leagues/{l}/transfers",
  "/api/v1/competition/{c}/leagues/{l}/market/history",
  "/api/v1/competition/{c}/leagues/{l}/teams",
  "/api/v1/competition/{c}/league/{l}/news",
  "/api/v3/leagues/{l}/news",
];

/** Recorta la respuesta: interesa la FORMA, no volcar la liga entera. */
function shape(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) {
    return { __array: value.length, muestra: value.length > 0 ? shape(value[0], depth + 1) : null };
  }
  if (value && typeof value === "object") {
    if (depth > 2) return "{…}";
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 25)
        .map(([key, inner]) => [key, shape(inner, depth + 1)]),
    );
  }
  if (typeof value === "string") return value.length > 60 ? `${value.slice(0, 60)}…` : value;
  return value;
}

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  try {
    const leagues = await getMyLeagues(auth.token);
    const league = leagues[0];
    if (!league) return privateJson({ error: "Tu cuenta no tiene ninguna liga." }, 404);

    const resultados = await Promise.all(
      CANDIDATES.map(async (plantilla) => {
        const path = plantilla.replace("{c}", COMPETITION_ID).replace("{l}", league.id);
        const url = new URL(path, LALIGA_PRIVATE_BASE_URL);
        url.searchParams.set("x-lang", "es");
        try {
          const response = await fetch(url.toString(), {
            headers: {
              ...DEFAULT_HEADERS,
              Authorization: `Bearer ${auth.token}`,
              "x-lang": "es",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(12_000),
          });
          if (!response.ok) return { path, estado: response.status };
          const cuerpo: unknown = await response.json().catch(() => null);
          return { path, estado: 200, forma: shape(cuerpo) };
        } catch (cause) {
          return { path, estado: "fallo", detalle: cause instanceof Error ? cause.name : "?" };
        }
      }),
    );

    const encontrados = resultados.filter((r) => r.estado === 200);
    return privateJson({
      liga: league.name,
      veredicto: encontrados.length
        ? `${encontrados.length} endpoint(s) responden. Mira su "forma" para ver si traen operaciones y precios.`
        : "Ninguna de las rutas probadas existe. La Actividad no es accesible por estas vias.",
      resultados,
    });
  } catch (error) {
    return errorJson(error);
  }
}
