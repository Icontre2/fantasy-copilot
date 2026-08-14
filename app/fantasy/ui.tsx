"use client";

import type { ReactNode } from "react";

/** Piezas de interfaz compartidas. Deliberadamente pocas y sin adornos. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[26px] glass p-4 text-white ${className}`}
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
  return <p className="rounded-2xl glass p-6 text-center text-sm text-neutral-400">{children}</p>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p
      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-5 text-rose-300"
      role="alert"
    >
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

/*
 * Aqui vivian `TableWrap`, `Th` y `Td`. Se han quitado con la ultima tabla:
 * en 390 px una tabla de seis columnas solo se lee a base de scroll lateral,
 * y lo que se veia era la cabecera cortada. Todo lo que era tabla es ahora
 * una fila con sus cifras debajo.
 */
