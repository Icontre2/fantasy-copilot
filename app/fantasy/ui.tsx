"use client";

import type { ReactNode } from "react";

/** Piezas de interfaz compartidas. Deliberadamente pocas y sin adornos. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[26px] border border-white/8 bg-[#121214] p-4 text-white shadow-[0_10px_35px_rgba(0,0,0,.3)] ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-[18px] font-bold tracking-tight text-white">{children}</h2>;
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
    <details className="rounded-2xl border border-white/10 bg-white/[.04] p-3 text-sm text-neutral-400">
      <summary className="cursor-pointer font-medium text-neutral-200">
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
  return <p className="rounded-2xl border border-white/8 bg-[#121214] p-6 text-center text-sm text-neutral-400">{children}</p>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      {message}
    </p>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <p className="grid min-h-48 place-items-center p-6 text-center text-sm text-neutral-400" role="status">
      <span><span className="mx-auto mb-3 block h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#8b5cf6]"/>{label}</span>
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
      className={`whitespace-nowrap border-b border-white/10 bg-[#121214] px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500 ${
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
      className={`whitespace-nowrap border-b border-white/8 px-2 py-2.5 text-sm ${
        align === "right" ? "text-right tabular-nums" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
