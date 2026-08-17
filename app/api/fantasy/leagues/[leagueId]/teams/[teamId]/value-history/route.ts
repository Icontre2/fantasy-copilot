import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getLeagueSnapshot, getMarketValueHistory } from "@/src/server/laliga/read";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const START = "2026-08-01";

/** Históricos oficiales, en lote, de una plantilla que pertenece a la liga. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ leagueId: string; teamId: string }> },
) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;
  const { leagueId, teamId } = await params;

  try {
    const snapshot = await getLeagueSnapshot(auth.token, leagueId);
    const team = snapshot.teams.find((candidate) => candidate.teamId === teamId);
    if (!team) return privateJson({ error: "Ese equipo no pertenece a esta liga." }, 404);

    const histories: Record<string, Array<{ date: string; marketValue: number }>> = {};
    const failedPlayerIds: string[] = [];
    let next = 0;
    async function worker() {
      while (next < team.players.length) {
        const player = team.players[next++];
        if (!player) return;
        try {
          histories[player.id] = (await getMarketValueHistory(player.id))
            .filter((point) => point.date.slice(0, 10) >= START);
        } catch {
          failedPlayerIds.push(player.id);
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(6, team.players.length) }, worker));

    console.info("[laliga/team-value-history] complete", {
      leagueId,
      teamId,
      players: team.players.length,
      histories: Object.keys(histories).length,
      failures: failedPlayerIds.length,
      from: START,
    });
    return privateJson({ teamId, from: START, histories, failedPlayerIds });
  } catch (error) {
    return errorJson(error);
  }
}
