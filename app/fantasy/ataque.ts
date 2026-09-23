import { blindajeVigente, estaBlindado } from "./defensa.ts";
import type { LeagueTeam, Position, SquadPlayer } from "./types";

/**
 * Ataque: la otra cara de Defensa. Con MI caja de hoy, ¿a quién de mis rivales
 * puedo quitarle un jugador pagando su cláusula, y cuáles merecen la pena?
 *
 * Alertas responde otra pregunta —qué cláusulas se están quedando baratas
 * respecto al valor— y solo mira a los jugadores cerca de ese punto. Aquí entra
 * toda la liga: cualquier jugador rival con cláusula publicada que tu caja
 * cubra.
 *
 * Todo es dato oficial: la cláusula, el blindaje, las medias, y tu caja (LALIGA
 * sí publica la tuya). No hay estimación en esta pantalla, salvo que tu caja
 * no se publique y haya que usar la reconstruida; entonces se marca.
 */

export type OrdenDeAtaque = "MEDIA" | "PUNTOS" | "SOBREPRECIO";
export type FiltroDePosicionAtaque = "TODAS" | Position;

export type Objetivo = {
  player: SquadPlayer;
  owner: { teamId: string; managerId: string; managerName: string };
  clausula: number;
  /** `clausula − valor`: lo que pagas por encima de lo que vale hoy. */
  sobreprecio: number;
  /** `clausula / valor`. 1,0 = pagas justo lo que vale. */
  ratio: number;
  /** Tu caja después de pagarla. */
  cajaTras: number;
  /** Fin del blindaje si lo está. `null` si se puede pagar ya. */
  blindadoHasta: string | null;
  blindado: boolean;
};

export type CriteriosDeAtaque = {
  teams: LeagueTeam[];
  myManagerId: string;
  miCaja: number;
  ahora: Date;
  orden: OrdenDeAtaque;
  posicion: FiltroDePosicionAtaque;
  /** Quitar lesionados, sancionados y los que ya no están en la liga. */
  soloDisponibles: boolean;
};

export type ResultadoDeAtaque = {
  /** Se pueden pagar ahora mismo. */
  ya: Objetivo[];
  /** Tu caja los cubre, pero están blindados: el que antes se libera, primero. */
  pronto: Objetivo[];
  /** Jugadores rivales con cláusula que tu caja no cubre. */
  fueraDeAlcance: number;
};

const NO_DISPONIBLE = new Set(["injured", "suspended", "out_of_league"]);

function comparar(orden: OrdenDeAtaque) {
  return (a: Objetivo, b: Objetivo): number => {
    if (orden === "PUNTOS") return (b.player.points ?? 0) - (a.player.points ?? 0) || a.clausula - b.clausula;
    if (orden === "SOBREPRECIO") return a.ratio - b.ratio || (b.player.averagePoints ?? 0) - (a.player.averagePoints ?? 0);
    return (b.player.averagePoints ?? 0) - (a.player.averagePoints ?? 0) || a.clausula - b.clausula;
  };
}

export function buscarObjetivos(c: CriteriosDeAtaque): ResultadoDeAtaque {
  const ya: Objetivo[] = [];
  const pronto: Objetivo[] = [];
  let fueraDeAlcance = 0;

  for (const team of c.teams) {
    if (team.manager.id === c.myManagerId) continue;
    for (const player of team.players ?? []) {
      const clausula = player.buyoutClause;
      if (typeof clausula !== "number" || !Number.isFinite(clausula) || clausula <= 0) continue;
      if (c.posicion !== "TODAS" && player.position !== c.posicion) continue;
      if (c.soloDisponibles && NO_DISPONIBLE.has(player.status)) continue;
      if (clausula > c.miCaja) { fueraDeAlcance += 1; continue; }

      const blindado = estaBlindado(player, c.ahora);
      const valor = player.marketValue > 0 ? player.marketValue : clausula;
      const objetivo: Objetivo = {
        player,
        owner: { teamId: team.teamId, managerId: team.manager.id, managerName: team.manager.name },
        clausula,
        sobreprecio: clausula - player.marketValue,
        ratio: clausula / valor,
        cajaTras: c.miCaja - clausula,
        blindadoHasta: blindajeVigente(player, c.ahora),
        blindado,
      };
      (blindado ? pronto : ya).push(objetivo);
    }
  }

  ya.sort(comparar(c.orden));
  pronto.sort((a, b) => (a.blindadoHasta ?? "9999").localeCompare(b.blindadoHasta ?? "9999"));
  return { ya, pronto, fueraDeAlcance };
}
