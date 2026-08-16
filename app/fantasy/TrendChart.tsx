"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Gráfica de una serie temporal que se puede recorrer con el dedo.
 *
 * ── La regla que manda aquí ──────────────────────────────────────────────────
 * El dedo NO interpola. Se salta al punto real más cercano y se enseña ESE, con
 * su fecha. Una gráfica es una línea continua, pero los datos son un puñado de
 * observaciones sueltas: si al arrastrar se mostrara el valor de la línea entre
 * dos puntos, la app estaría inventando una cotización que LALIGA nunca publicó.
 * Por eso el punto marcado siempre cae encima de un dato que existe.
 *
 * ── Detalles que importan en un móvil ────────────────────────────────────────
 * `touch-action: pan-y` deja que la página siga bajando con el dedo en vertical
 * mientras el arrastre horizontal recorre la serie. Sin eso, o no se puede
 * hacer scroll encima de la gráfica, o no se puede recorrer.
 *
 * El valor leído se queda puesto al levantar el dedo: hay que levantarlo para
 * poder mirar, así que borrarlo justo entonces sería quitarlo en el único
 * momento en que se puede leer.
 */

export type TrendPoint = { date: string; value: number };

/** Alto del `viewBox`. La gráfica se estira por CSS; esto solo fija la relación. */
const ALTO = 40;
/** Margen interno para que la línea no se corte al tocar los bordes. */
const MARGEN = 2;

type Props = {
  points: TrendPoint[];
  /** Cómo escribir el valor (millones, puntos…). */
  formatValue: (value: number) => string;
  formatDate: (iso: string) => string;
  color?: string;
  /** Descripción para lectores de pantalla. */
  label: string;
  className?: string;
};

function coordenadaY(value: number, min: number, span: number): number {
  return MARGEN + (1 - (value - min) / span) * (ALTO - MARGEN * 2);
}

export function TrendChart({
  points,
  formatValue,
  formatDate,
  color = "#8b5cf6",
  label,
  className = "",
}: Props) {
  const [activo, setActivo] = useState<number | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);

  const path = points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 100;
      return `${index ? "L" : "M"}${x},${coordenadaY(point.value, min, span)}`;
    })
    .join(" ");

  /** Índice del punto REAL más cercano a donde está el dedo. */
  const indiceEn = useCallback(
    (clientX: number): number => {
      const caja = areaRef.current?.getBoundingClientRect();
      if (!caja || caja.width === 0) return 0;
      const proporcion = (clientX - caja.left) / caja.width;
      const indice = Math.round(proporcion * (points.length - 1));
      return Math.min(points.length - 1, Math.max(0, indice));
    },
    [points.length],
  );

  const seguir = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Solo se recorre con el dedo apoyado; si no, cualquier paso del ratón
      // por encima movería la lectura sin que nadie se lo haya pedido.
      if (event.buttons === 0 && event.pointerType === "mouse") return;
      setActivo(indiceEn(event.clientX));
    },
    [indiceEn],
  );

  const punto = activo === null ? null : points[activo];
  const ultimo = points.at(-1)!;
  const mostrado = punto ?? ultimo;
  const xPorCiento = activo === null ? null : (activo / Math.max(1, points.length - 1)) * 100;
  const yPorCiento = punto ? (coordenadaY(punto.value, min, span) / ALTO) * 100 : null;

  return (
    <div className={className}>
      {/*
        La lectura va ARRIBA y no pegada al dedo: un globito bajo el pulgar
        queda tapado por la propia mano. Es `aria-live` para que quien navegue
        con teclado oiga el valor al moverse por la serie.
      */}
      <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-neutral-500">
          {activo === null ? "Desliza el dedo por la gráfica" : formatDate(mostrado.date)}
        </span>
        <output aria-live="polite" className="text-right">
          <span className="font-bold tabular-nums text-white">{formatValue(mostrado.value)}</span>
          {activo === null && <span className="text-neutral-500"> · {formatDate(ultimo.date)}</span>}
        </output>
      </div>

      <div
        ref={areaRef}
        role="img"
        aria-label={label}
        tabIndex={0}
        className="relative h-44 w-full touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/50"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setActivo(indiceEn(event.clientX));
        }}
        onPointerMove={seguir}
        onPointerCancel={() => setActivo(null)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const desde = activo ?? points.length - 1;
          const paso = event.key === "ArrowLeft" ? -1 : 1;
          setActivo(Math.min(points.length - 1, Math.max(0, desde + paso)));
        }}
      >
        <svg
          viewBox={`0 0 100 ${ALTO}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          aria-hidden
        >
          {xPorCiento !== null && (
            <line
              x1={xPorCiento}
              x2={xPorCiento}
              y1="0"
              y2={ALTO}
              stroke="currentColor"
              className="text-white/40"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/*
          El punto va en HTML y no en SVG a propósito: el `viewBox` se estira sin
          conservar proporción, así que un círculo dibujado dentro saldría
          aplastado en un óvalo.
        */}
        {xPorCiento !== null && yPorCiento !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black"
            style={{
              left: `${xPorCiento}%`,
              top: `${yPorCiento}%`,
              background: color,
              boxShadow: `0 0 0 4px ${color}33`,
            }}
          />
        )}
      </div>
    </div>
  );
}
