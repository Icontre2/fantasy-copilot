import { errorJson, privateJson } from "@/src/server/http/responses";
import { requireSession } from "@/src/server/http/session-guard";
import { getLeagueSnapshot, getMyProfile, getPlayerCatalog } from "@/src/server/laliga/read";
import { getApercibidos } from "@/src/server/futbolfantasy/apercibidos";
import { FUTBOLFANTASY_TEAM_SLUGS } from "@/src/server/futbolfantasy/teams";
import { normalizePlayerName } from "@/src/server/futbolfantasy/match";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/fantasy/leagues/{leagueId}/bajas
 *
 * Lesionados, sancionados y en duda de toda LaLiga (estado oficial del
 * catálogo de LALIGA Fantasy) y apercibidos —a una amarilla de sanción— según
 * FútbolFantasy. Cada uno con su dueño en tu liga, para ver de un vistazo qué
 * te afecta a ti y qué a tus rivales.
 */
const ESTADOS = new Set(["injured", "suspended", "doubtful"]);

export async function GET(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const auth = await requireSession(request);
  if ("response" in auth) return auth.response;
  const { leagueId } = await params;

  try {
    const [catalogo, snapshot, perfil, apercibidos] = await Promise.all([
      getPlayerCatalog(),
      getLeagueSnapshot(auth.token, leagueId),
      getMyProfile(auth.token),
      getApercibidos().catch(() => null),
    ]);
    const dueno = new Map<string, { managerName: string; esMio: boolean }>();
    for (const team of snapshot.teams) for (const p of team.players) dueno.set(p.id, { managerName: team.manager.name, esMio: team.manager.id === perfil.id });

    const bajas = catalogo
      .filter((p) => ESTADOS.has(p.status))
      .map((player) => ({ player, motivo: player.status as string, amarillas: null as number[] | null, dueno: dueno.get(player.id) ?? null }));

    const slugAEquipo = new Map(Object.entries(FUTBOLFANTASY_TEAM_SLUGS).map(([id, slug]) => [slug, id]));
    for (const a of apercibidos ?? []) {
      const teamId = slugAEquipo.get(a.teamSlug);
      const delEquipo = catalogo.filter((p) => p.teamId === teamId);
      const nombre = normalizePlayerName(a.name);
      const palabras = nombre.split(" ").filter((w) => w.length >= 3);
      const player = delEquipo.find((p) => normalizePlayerName(p.name) === nombre)
        ?? (() => { for (const w of palabras) { const c = delEquipo.filter((p) => normalizePlayerName(p.name).split(" ").includes(w)); if (c.length === 1) return c[0]; } return undefined; })();
      if (!player) continue;
      bajas.push({ player, motivo: "apercibido", amarillas: a.jornadas, dueno: dueno.get(player.id) ?? null });
    }

    return privateJson({ bajas, apercibidosDisponibles: apercibidos !== null });
  } catch (error) {
    return errorJson(error);
  }
}
