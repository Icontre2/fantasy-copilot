"use client";

import { useEffect, useState } from "react";
import type { DificultadDeEquipo } from "@/src/server/odds/team-difficulty";
import { get } from "./api";

export type { DificultadDeEquipo };

export type DifficultyResponse = {
  week: number;
  byTeam: Record<string, DificultadDeEquipo>;
  /** `false` = la fuente de cuotas no respondió. Distinto de «aún no hay». */
  cuotasDisponibles: boolean;
};

/**
 * La dificultad de la jornada, una sola vez para toda la sesión.
 *
 * La piden el campo y la ficha del jugador, y la ficha se abre y se cierra
 * muchas veces seguidas. Sin esta caché serían tantas peticiones como fichas
 * abiertas, todas con la misma respuesta: las cuotas no se mueven mientras
 * navegas.
 *
 * La promesa se guarda, no el resultado, así que dos componentes que monten a la
 * vez comparten la MISMA petición en vez de lanzar dos.
 */
let enVuelo: Promise<DifficultyResponse> | null = null;

function cargar(): Promise<DifficultyResponse> {
  enVuelo ??= get<DifficultyResponse>("/api/fantasy/difficulty").catch((error: unknown) => {
    // Un fallo no se cachea: si se guardara, un corte de red dejaría la app sin
    // cuotas hasta recargar la página entera.
    enVuelo = null;
    throw error;
  });
  return enVuelo;
}

/**
 * Dificultad por id de equipo, o `null` mientras carga o si no se pudo.
 *
 * No devuelve error: esto es contexto de apoyo. Si no llega, el campo y la ficha
 * se enseñan igual sin ello — lo que no puede pasar es que una pantalla entera
 * se caiga porque una casa de apuestas no conteste.
 */
export function useDificultad(): DifficultyResponse | null {
  const [data, setData] = useState<DifficultyResponse | null>(null);

  useEffect(() => {
    let cancelado = false;
    cargar()
      .then((respuesta) => {
        if (!cancelado) setData(respuesta);
      })
      .catch(() => {
        // Silencio a propósito: ver el comentario de la función.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return data;
}

/**
 * Verde, ámbar o rojo según lo favorable. El color nunca va solo: ver `etiqueta`.
 *
 * Dos variantes porque el fondo manda. Sobre el gris de la ficha vale un tinte
 * translúcido; sobre el verde del campo ese mismo tinte se enturbia y el rojo
 * acaba pareciendo gris, así que allí el color va en el texto y el fondo es
 * negro. Los cortes son los mismos en las dos para que digan lo mismo.
 */
export function tonoDeDificultad(probabilidadGanar: number): string {
  if (probabilidadGanar >= 0.6) return "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30";
  if (probabilidadGanar >= 0.45) return "bg-emerald-500/12 text-emerald-200/90 ring-1 ring-emerald-400/20";
  if (probabilidadGanar >= 0.3) return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25";
  if (probabilidadGanar >= 0.18) return "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/25";
  return "bg-rose-500/25 text-rose-100 ring-1 ring-rose-400/40";
}

/** La misma escala, para chips sobre fondo oscuro. */
export function colorDeDificultad(probabilidadGanar: number): string {
  if (probabilidadGanar >= 0.6) return "text-emerald-300";
  if (probabilidadGanar >= 0.45) return "text-emerald-400";
  if (probabilidadGanar >= 0.3) return "text-amber-300";
  if (probabilidadGanar >= 0.18) return "text-rose-300";
  return "text-rose-400";
}
