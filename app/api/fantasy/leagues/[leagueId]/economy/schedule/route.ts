import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { readSessionId } from "@/src/server/laliga/session";
import {
  describeSchedule,
  disableAutoSync,
  enableAutoSync,
  readSubscription,
} from "@/src/server/laliga/economy/schedule";

export const dynamic = "force-dynamic";

/** GET: estado de la sincronizacion automatica de esta liga. */
export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    return privateJson(describeSchedule(await readSubscription(leagueId)));
  } catch (error) {
    return errorJson(error);
  }
}

/**
 * POST: activa la sincronizacion automatica, atandola a ESTA sesion.
 *
 * La tarea programada no tiene cookie, asi que necesita guardar con que sesion
 * leer la liga. Cuando esa sesion caduque, la tarea se para y lo dice — no sigue
 * en silencio.
 */
export async function POST(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;
  // `requireSession` ya garantiza que la sesion existe y es valida.
  const sessionId = readSessionId(request) as string;

  const body = (await request.json().catch(() => null)) as { leagueName?: string } | null;

  try {
    const subscription = await enableAutoSync({
      leagueId,
      sessionId,
      leagueName: body?.leagueName,
    });
    return privateJson(describeSchedule(subscription));
  } catch (error) {
    return errorJson(error);
  }
}

/** DELETE: desactiva la sincronizacion automatica. El historico ya guardado se conserva. */
export async function DELETE(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;

  const { leagueId } = await params;

  try {
    await disableAutoSync(leagueId);
    return privateJson(describeSchedule(await readSubscription(leagueId)));
  } catch (error) {
    return errorJson(error);
  }
}
