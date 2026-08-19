"use client";

import { useEffect, useState } from "react";
import { getCacheado } from "./api";
import { Pitch } from "./Pitch";
import { SquadValueHistory } from "./SquadValueHistory";
import type { Player, PlayerWithProbability } from "./types";
import { Spinner } from "./ui";

/** Lo que devuelve la ruta del once de un rival. */
export type RivalLineup = {
  teamId: string;
  manager: { id: string; name: string; avatar?: string };
  teamValue?: number;
  lineup: { formation: string; starters: PlayerWithProbability[]; bench: PlayerWithProbability[] };
};

/**
 * La ficha de un participante: su once probable y su plantilla entera con la
 * evolución de valor.
 *
 * Vive aquí y no dentro de una pantalla porque la piden dos: la lista de la
 * Liga, que la despliega en línea, y el resumen de Inicio, que la abre en una
 * hoja al tocar un competidor. Cuando esto estaba escrito dentro de `LeagueView`
 * el segundo sitio solo podía tenerla copiándola, y dos copias del mismo panel
 * dejan de enseñar lo mismo en cuanto una de las dos se toca.
 *
 * `players` es opcional. Quien ya tiene la plantilla —la pantalla de Liga la
 * recibe entera— la pasa; quien no la tiene —Inicio solo conoce el `teamId` de
 * cada rival— la deja fuera y se saca del once, que trae titulares y banquillo,
 * o sea la plantilla completa.
 *
 * ── Las dos descargas van A LA VEZ, y eso no es un detalle ───────────────────
 * Las dos son lentas: el once cruza las alineaciones probables de una docena de
 * clubes, y el histórico baja la cotización de unos veinticuatro jugadores.
 * Encadenarlas hacía esperar la SUMA de las dos, y era exactamente lo que
 * pasaba: `SquadValueHistory` solo se montaba cuando ya había plantilla, y sin
 * `players` la plantilla salía del once. Medido en el navegador con retardos
 * realistas: 4,4 s de espera para abrir la ficha de un rival.
 *
 * La descarga del histórico NO necesita la lista —el servidor deduce los
 * jugadores del `teamId`—, así que ahora se monta desde el primer instante con
 * `players` a `null` y la lista se rellena cuando llega el once. La espera pasa
 * a ser la de la más lenta, no la de las dos.
 */
export function RivalSquad({
  leagueId,
  teamId,
  managerName,
  players,
  onPlayer,
}: {
  leagueId: string;
  teamId: string;
  managerName: string;
  players?: Player[];
  onPlayer: (player: Player) => void;
}) {
  const [data, setData] = useState<RivalLineup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  /*
   * No se reinicia el estado aquí dentro: quien usa esto le pone un `key` con
   * el equipo, así que cambiar de manager remonta el componente y los estados
   * vuelven solos a su valor inicial. Resetearlos a mano en el efecto provoca
   * un render en cascada (y lo prohíbe `react-hooks/set-state-in-effect`).
   */
  useEffect(() => {
    let cancelado = false;
    getCacheado<RivalLineup>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/teams/${encodeURIComponent(teamId)}/lineup`)
      .then((respuesta) => { if (!cancelado) setData(respuesta); })
      .catch((caught: unknown) => {
        if (!cancelado) setError(caught instanceof Error ? caught.message : "No se pudo calcular su once.");
      })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [leagueId, teamId]);

  const plantilla = players ?? (data ? [...data.lineup.starters, ...data.lineup.bench] : null);

  return (
    <>
      <div className="mt-2">
        {cargando ? (
          <Spinner label={`Montando el once de ${managerName}…`} />
        ) : error || !data ? (
          // Que falle el once no debe esconder la plantilla si ya la tenemos.
          <p className="rounded-2xl bg-white/[.03] p-3 text-xs leading-4 text-neutral-500">
            {error ?? "Sin once probable."}
          </p>
        ) : (
          <>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-400">Once probable</p>
              <p className="text-sm font-bold text-white">{data.lineup.formation}</p>
            </div>
            {/* `jornada` va a `null`: los puntos por jornada se enseñan en tu
                propia pantalla, donde se elige de qué jornada se habla. */}
            <Pitch starters={data.lineup.starters} jornada={null} onSelect={onPlayer} />
            <p className="mt-2 text-[11px] leading-4 text-neutral-500">
              Calculado con los porcentajes de FútbolFantasy. <strong>No es su alineación real</strong>:
              LALIGA no publica las alineaciones ajenas.
            </p>
          </>
        )}
      </div>

      <div className="mt-3">
        <SquadValueHistory
          leagueId={leagueId}
          teamId={teamId}
          players={plantilla}
          title={`Plantilla de ${managerName}`}
          onPlayer={onPlayer}
        />
      </div>
    </>
  );
}
