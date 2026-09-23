/**
 * La tarjeta para compartir tu plantilla: qué dice, separado de cómo se dibuja.
 *
 * Es el único sitio de la app pensado para salir de ella —al grupo de la liga,
 * a una historia—, así que tiene que cumplir la misma regla que el resto: nada
 * que no sea un dato de LALIGA o un cálculo explicado. Por eso el texto se
 * decide aquí, en puro, y se prueba; `ShareCard.tsx` solo lo pinta.
 *
 * No lleva caja ni cláusulas: eso es información de tu liga que no tiene por
 * qué acabar en una captura pública.
 */

import { millions } from "./format.ts";

export type EntradaDeTarjeta = {
  managerName: string;
  leagueName: string;
  teamValue: number | null | undefined;
  /** Variación del valor en el periodo elegido. `null` = sin histórico. */
  delta: number | null;
  /** Etiqueta del periodo tal cual la ve el usuario: «7D», «Desde 1 ago»… */
  periodo: string;
  position: number | null | undefined;
  totalManagers: number;
  points: number | null | undefined;
};

export type TextoDeTarjeta = {
  antetitulo: string;
  valor: string;
  variacion: string | null;
  sube: boolean | null;
  posicion: string | null;
  puntos: string | null;
  pie: string;
};

export function textoDeTarjeta(e: EntradaDeTarjeta): TextoDeTarjeta {
  const variacion = e.delta === null || !Number.isFinite(e.delta)
    ? null
    : `${e.delta >= 0 ? "+" : ""}${millions(e.delta)} · ${e.periodo}`;
  const posicion = typeof e.position === "number" && e.position > 0
    ? `#${e.position}${e.totalManagers > 0 ? ` de ${e.totalManagers}` : ""}`
    : null;
  return {
    antetitulo: `${e.managerName} · ${e.leagueName}`,
    valor: millions(e.teamValue),
    variacion,
    sube: e.delta === null || !Number.isFinite(e.delta) ? null : e.delta >= 0,
    posicion,
    puntos: typeof e.points === "number" && Number.isFinite(e.points) ? `${e.points} pts` : null,
    pie: "LigaLab · herramienta independiente, no afiliada a LALIGA",
  };
}

/** Nombre de fichero sin caracteres que rompan en ningún sistema. */
export function nombreDeFichero(managerName: string, fecha: Date): string {
  const limpio = managerName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "plantilla";
  return `ligalab-${limpio}-${fecha.toISOString().slice(0, 10)}.png`;
}
