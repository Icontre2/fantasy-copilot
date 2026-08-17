import type { Player, SquadPlayer } from "@/src/domain/fantasy";

export type ComparisonPlayer = Player & Pick<SquadPlayer, "buyoutClause" | "isShielded" | "shieldedUntil">;

/**
 * Une catálogo y plantillas sin duplicados.
 *
 * El catálogo aporta todos los jugadores de LALIGA. La plantilla manda cuando
 * el mismo jugador está fichado porque contiene la cláusula y el estado propio
 * de esa liga. Un fichaje recién incorporado que aún no esté en el catálogo
 * tampoco desaparece.
 */
export function mergeComparisonPlayers(
  catalog: Player[],
  owned: SquadPlayer[],
): ComparisonPlayer[] {
  const byId = new Map<string, ComparisonPlayer>();
  catalog.forEach((player) => byId.set(player.id, player));
  owned.forEach((player) => byId.set(player.id, { ...byId.get(player.id), ...player }));
  return [...byId.values()].sort(
    (a, b) => a.name.localeCompare(b.name, "es") || a.team.localeCompare(b.team, "es"),
  );
}
