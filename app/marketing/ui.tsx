"use client";

import type { ReactNode } from "react";
import type { AccionDeAuditoria, Estado } from "./types";

/**
 * Piezas compartidas del panel. Copian el lenguaje visual de LigaLab (glass,
 * paleta oscura de `globals.css`, que ya carga el layout raíz) con el rojo de
 * marca como acento SOLO aquí dentro — el resto de la app sigue en morado.
 */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[22px] glass p-4 text-white ${className}`}>{children}</section>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-[#ff8a93]">{children}</h2>;
}

export function Spinner({ label }: { label: string }) {
  return (
    <p className="grid min-h-40 place-items-center p-6 text-center text-sm text-neutral-400" role="status">
      <span>
        <span className="mx-auto mb-3 block h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#d84955]" />
        {label}
      </span>
    </p>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-5 text-rose-300" role="alert">
      {message}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl glass p-6 text-center text-sm text-neutral-400">{children}</p>;
}

const ESTILO_ESTADO: Record<Estado, string> = {
  draft: "bg-white/10 text-neutral-300",
  ready_for_design: "bg-indigo-500/15 text-indigo-300",
  brand_review: "bg-amber-500/15 text-amber-300",
  fact_review: "bg-amber-500/15 text-amber-300",
  pending_approval: "bg-[#d84955]/25 text-[#ff9aa1]",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-white/10 text-neutral-400",
  blocked: "bg-rose-500/20 text-rose-300",
  generated: "bg-blue-500/15 text-blue-300",
  published: "bg-blue-500/15 text-blue-300",
};

const ETIQUETA_ESTADO: Record<Estado, string> = {
  draft: "Borrador",
  ready_for_design: "Listo para diseño",
  brand_review: "Revisión de marca",
  fact_review: "Revisión de hechos",
  pending_approval: "Pendiente de aprobar",
  approved: "Aprobado",
  rejected: "Rechazado",
  blocked: "Bloqueado",
  generated: "Generado",
  published: "Publicado",
};

export function EstadoBadge({ status }: { status: Estado }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${ESTILO_ESTADO[status]}`}>
      {ETIQUETA_ESTADO[status]}
    </span>
  );
}

export const ETIQUETA_ACCION: Record<AccionDeAuditoria, string> = {
  created: "Detectado",
  qa_passed: "QA superado",
  qa_failed: "QA no superado",
  edited: "Editado",
  approved: "Aprobado",
  rejected: "Rechazado",
  reopened: "Reabierto",
  capture_added: "Captura adjuntada",
};

export function fechaLegible(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** `textarea` de una línea por elemento ↔ `string[]`. Vacío es lista vacía, no `[""]`. */
export function lineasAArray(texto: string): string[] {
  return texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-xl bg-[#d84955] px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-35 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-35 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
