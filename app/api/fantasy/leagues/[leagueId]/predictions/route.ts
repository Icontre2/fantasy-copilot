import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getCalendar, getCurrentWeekPublic, getMyProfile, getPlayerCatalog } from "@/src/server/laliga/read";
import { hasSupabaseAdmin, supabaseAdmin } from "@/src/server/storage/supabase-admin";
import { errorMedio, evaluar, jornadaEmpezada, leerPrediccion, type JugadorRegistrado } from "@/src/server/predictions/registro";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * /api/fantasy/leagues/{leagueId}/predictions — el registro del predictor.
 *
 * POST guarda lo que predice la app para la jornada que viene, SOLO mientras
 * no ha empezado: en cuanto rueda el primer balón queda congelada. GET
 * devuelve cuánto acertó en las jornadas ya terminadas. Reglas en
 * `src/server/predictions/registro.ts`.
 *
 * Todo va por el servidor con la sesión del propio manager: el navegador no
 * habla con la tabla, y nadie puede leer ni escribir el registro de otro.
 */

type Fila = { jornada: number; formacion: string; total: number | string; jugadores: JugadorRegistrado[] };

export async function POST(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;
  if (!hasSupabaseAdmin()) return privateJson({ guardada: false, motivo: "Sin base de datos." });
  const { leagueId } = await params;

  let prediccion;
  try {
    prediccion = leerPrediccion(await request.json());
  } catch {
    prediccion = null;
  }
  if (!prediccion) return privateJson({ error: "Predicción no válida." }, 400);

  try {
    const [perfil, partidos] = await Promise.all([getMyProfile(auth.token), getCalendar(prediccion.jornada)]);
    if (jornadaEmpezada(partidos.map((p) => p.kickoff), new Date())) {
      return privateJson({ guardada: false, motivo: "La jornada ya empezó: la predicción queda congelada." });
    }
    const { error } = await supabaseAdmin().from("fantasy_prediction_log").upsert({
      league_id: leagueId,
      manager_id: perfil.id,
      jornada: prediccion.jornada,
      formacion: prediccion.formacion,
      total: prediccion.total,
      jugadores: prediccion.jugadores,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`No se pudo guardar la predicción: ${error.message}`);
    return privateJson({ guardada: true });
  } catch (error) {
    return errorJson(error);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;
  if (!hasSupabaseAdmin()) return privateJson({ evaluaciones: [], errorMedio: null });
  const { leagueId } = await params;

  try {
    const [perfil, actual, catalogo] = await Promise.all([getMyProfile(auth.token), getCurrentWeekPublic(), getPlayerCatalog()]);
    const { data, error } = await supabaseAdmin()
      .from("fantasy_prediction_log")
      .select("jornada, formacion, total, jugadores")
      .match({ league_id: leagueId, manager_id: perfil.id })
      .order("jornada", { ascending: false })
      .limit(12);
    if (error) throw new Error(`No se pudo leer el registro: ${error.message}`);

    const puntos = new Map(catalogo.map((p) => [p.id, p.weekPoints ?? []]));
    const puntosReales = (id: string, jornada: number) => puntos.get(id)?.find((e) => e.jornada === jornada)?.puntos ?? null;

    /*
     * Solo jornadas TERMINADAS: las anteriores a la en curso. La en curso no se
     * evalúa aunque parezca acabada: entre partido y partido LALIGA no la marca
     * en juego, y desde aquí no se sabe si queda alguno por jugar.
     */
    const terminada = (jornada: number) => jornada < actual.weekNumber;
    const filas = (data ?? []) as Fila[];
    const evaluaciones = filas
      .filter((f) => terminada(f.jornada))
      .map((f) => evaluar({ jornada: f.jornada, total: Number(f.total), jugadores: f.jugadores }, puntosReales));

    return privateJson({ evaluaciones, errorMedio: errorMedio(evaluaciones) });
  } catch (error) {
    return errorJson(error);
  }
}

