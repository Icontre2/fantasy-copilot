"use client";

import type { ReactNode } from "react";

/** Piezas de interfaz compartidas. Deliberadamente pocas y sin adornos. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-neutral-200 bg-white p-4 ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-lg font-semibold text-neutral-900">{children}</h2>;
}

/**
 * Aviso sobre el origen y los limites de los datos de la pantalla.
 *
 * No es decoracion: es donde la app dice que NO sabe. Va visible en la propia
 * pantalla, no escondido en un tooltip, porque distinguir dato oficial de
 * calculo es parte de leer bien la cifra de al lado.
 */
export function DataNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <details className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
      <summary className="cursor-pointer font-medium text-neutral-800">
        De dónde salen estos datos
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </details>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-neutral-50 p-6 text-center text-sm text-neutral-500">{children}</p>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
      {message}
    </p>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <p className="p-6 text-center text-sm text-neutral-500" role="status">
      {label}
    </p>
  );
}

/** Contenedor de tabla que scrollea en horizontal sin arrastrar la pagina. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4">{children}</div>;
}

export function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`whitespace-nowrap border-b border-neutral-200 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap border-b border-neutral-100 px-2 py-2 text-sm ${
        align === "right" ? "text-right tabular-nums" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
