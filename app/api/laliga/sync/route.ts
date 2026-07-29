import { NextRequest } from "next/server";
import { buildLaligaSnapshot, parseLaligaLeagues } from "../../../laliga-contract";
import type { Json } from "../../../database.types";
import { isAllowedRequestOrigin } from "../../../laliga-session";
import {
  getLaligaSession,
  getUserScopedSupabase,
  isSafeLaligaSegment,
  LaligaUpstreamError,
  laligaGet,
  noStoreJson,
  privateBetaUnavailable,
  readSmallJson,
  respondToLaligaError,
} from "../shared";
import { takeRateLimit } from "../rate-limit";

type SyncBody = {
  fantasyTeamId?: unknown;
  leagueId?: unknown;
  teamId?: unknown;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readSyncPart(
  label: string,
  path: string,
  accessToken: string,
): Promise<unknown> {
  try {
    return await laligaGet(path, accessToken);
  } catch (error) {
    if (error instanceof LaligaUpstreamError) {
      console.error("LALIGA_SYNC_READ_FAILED", {
        label,
        path,
        status: error.status,
      });
      throw new LaligaUpstreamError(
        `No se pudo leer ${label} de LALIGA Fantasy.`,
        error.status,
      );
    }
    console.error("LALIGA_SYNC_READ_UNEXPECTED", { label, path });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const unavailable = privateBetaUnavailable();
  if (unavailable) return unavailable;

  if (!isAllowedRequestOrigin(request)) {
    return noStoreJson({ error: "Origen de solicitud no permitido." }, { status: 403 });
  }

  const auth = await getUserScopedSupabase(request);
  if (!auth) {
    return noStoreJson(
      { error: "Inicia sesión en Fantasy Copilot para continuar." },
      { status: 401 },
    );
  }

  const session = await getLaligaSession(request, auth.user.id);
  if (!session) {
    return noStoreJson(
      { error: "Conecta tu cuenta de LALIGA Fantasy." },
      { status: 401 },
    );
  }

  const rate = takeRateLimit("sync:" + auth.user.id, 5, 5 * 60_000);
  if (!rate.allowed) {
    const response = noStoreJson(
      { error: "Has sincronizado varias veces. Espera antes de repetir." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return response;
  }

  let body: SyncBody;
  try {
    body = (await readSmallJson(request, 4_096)) as SyncBody;
  } catch {
    return noStoreJson({ error: "Selección de liga no válida." }, { status: 400 });
  }

  const leagueId = typeof body.leagueId === "string" ? body.leagueId : "";
  const teamId = typeof body.teamId === "string" ? body.teamId : "";
  const fantasyTeamId =
    typeof body.fantasyTeamId === "string" ? body.fantasyTeamId : null;

  if (
    !isSafeLaligaSegment(leagueId) ||
    !isSafeLaligaSegment(teamId) ||
    (fantasyTeamId !== null && !UUID.test(fantasyTeamId))
  ) {
    return noStoreJson({ error: "Selección de liga no válida." }, { status: 400 });
  }

  try {
    const leaguesRaw = await laligaGet(
      "/v1/competition/1/leagues",
      session.accessToken,
    );
    const league = parseLaligaLeagues(leaguesRaw).find(
      (candidate) => candidate.id === leagueId && candidate.teamId === teamId,
    );
    if (!league) {
      return noStoreJson(
        { error: "La liga seleccionada no pertenece a esta cuenta." },
        { status: 403 },
      );
    }

    const team = await readSyncPart(
      "la plantilla",
      `/v1/competition/1/leagues/${leagueId}/teams/${teamId}`,
      session.accessToken,
    );
    const money = await readSyncPart(
      "el saldo",
      `/v1/competition/1/teams/${teamId}/money`,
      session.accessToken,
    );
    const lineup = await readSyncPart(
      "la alineación",
      `/v1/competition/1/teams/${teamId}/lineup`,
      session.accessToken,
    );
    const market = await readSyncPart(
      "el mercado",
      `/v1/competition/1/league/${leagueId}/market`,
      session.accessToken,
    );
    const clubs = await readSyncPart(
      "los equipos maestros",
      "/v3/teams-master",
      session.accessToken,
    );

    const snapshot = buildLaligaSnapshot({
      team,
      money,
      lineup,
      market,
      clubs,
      league,
    });
    if (snapshot.squad.length > 50 || snapshot.market.length > 500) {
      return noStoreJson(
        { error: "LALIGA devolvió más filas de las esperadas." },
        { status: 502 },
      );
    }

    const { data, error } = await auth.client.rpc("replace_laliga_snapshot", {
      p_fantasy_team_id:
        fantasyTeamId ?? (null as unknown as string),
      p_league_id: league.id,
      p_team_name: league.name,
      p_balance: snapshot.balance,
      p_squad_value: snapshot.squadValue,
      p_squad: snapshot.squad as unknown as Json,
      p_market: snapshot.market as unknown as Json,
    });

    if (error) {
      console.error("LALIGA_SYNC_SAVE_FAILED", { code: error.code });
      return noStoreJson(
        {
          error:
            "Los datos se leyeron, pero no se pudieron guardar. Tu plantilla anterior sigue intacta.",
        },
        { status: 500 },
      );
    }

    const result =
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : {};

    return noStoreJson({
      synced: true,
      teamId: result.teamId ?? fantasyTeamId,
      squadCount: snapshot.squad.length,
      marketCount: snapshot.market.length,
      balance: snapshot.balance,
      squadValue: snapshot.squadValue,
    });
  } catch (error) {
    if (error instanceof LaligaUpstreamError) {
      return respondToLaligaError(error);
    }
    console.error("LALIGA_SYNC_UNEXPECTED");
    return noStoreJson(
      {
        error:
          "La estructura de datos de LALIGA ha cambiado. No se ha reemplazado ningún dato.",
      },
      { status: 502 },
    );
  }
}
