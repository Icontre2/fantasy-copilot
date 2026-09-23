"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, CircleAlert, Sparkles } from "lucide-react";
import { get } from "./api";
import { AccessGate } from "./AccessGate";
import { Card, Empty, ErrorBox, EstadoBadge, Spinner } from "./ui";
import type { Paquete } from "./types";

/**
 * `/marketing` — fase 2: la cola.
 *
 * Cero tabla: en un iPhone una tabla de diez columnas es scroll horizontal, no
 * información. Cada pieza es una tarjeta con lo que hace falta para decidir
 * si merece la pena abrirla, y el orden ya llega listo del servidor
 * (`ordenDeCola`): pendiente de aprobar primero, bloqueado después, el resto
 * por fecha.
 */
export default function MarketingPage() {
  return (
    <AccessGate>
      <Cola />
    </AccessGate>
  );
}

function Cola() {
  const [estado, setEstado] = useState<{ cargando: boolean; cola: Paquete[]; error: string | null }>({
    cargando: true,
    cola: [],
    error: null,
  });

  useEffect(() => {
    let vivo = true;
    get<{ queue: Paquete[] }>("queue")
      .then((respuesta) => {
        if (vivo) setEstado({ cargando: false, cola: respuesta.queue, error: null });
      })
      .catch((error: unknown) => {
        if (vivo) setEstado({ cargando: false, cola: [], error: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-[calc(env(safe-area-inset-top)+20px)]">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#ff8a93]">Marketing · privado</p>
        <h1 className="mt-1 text-2xl font-black text-white">Cola de aprobación</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Lo pendiente de decidir va primero. Ningún botón de este panel publica nada por su cuenta.
        </p>
      </header>

      {estado.cargando && <Spinner label="Cargando la cola…" />}
      {estado.error && <ErrorBox message={estado.error} />}
      {!estado.cargando && !estado.error && estado.cola.length === 0 && (
        <Empty>Todavía no hay ningún paquete en marketing/generated/.</Empty>
      )}

      <ul className="space-y-3">
        {estado.cola.map((pieza) => (
          <li key={pieza.id}>
            <Link href={`/marketing/${pieza.id}`} className="block">
              <Card className="transition active:scale-[0.99]">
                {pieza.blocked ? <FilaBloqueada pieza={pieza} /> : <FilaNormal pieza={pieza} />}
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

/*
 * Dos cosas distintas con la misma pinta hasta ahora: una pieza rota, que
 * alguien tiene que arreglar, y una carpeta de trabajo sin `package.json`
 * todavía, que no pide nada de nadie. Pintar las once que hay en curso de rojo
 * y con «Bloqueado» convertía la alarma en ruido de fondo.
 */
function FilaBloqueada({ pieza }: { pieza: Extract<Paquete, { blocked: true }> }) {
  const enCurso = pieza.enPreparacion;
  return (
    <div className="flex items-start gap-3">
      <CircleAlert
        className={`mt-0.5 h-5 w-5 shrink-0 ${enCurso ? "text-neutral-500" : "text-rose-400"}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="truncate font-mono text-xs text-neutral-500">
          {pieza.id} · {pieza.date}
        </p>
        <p className={`mt-1 text-sm font-semibold ${enCurso ? "text-neutral-400" : "text-rose-300"}`}>
          {enCurso ? "En preparación" : "Bloqueado"}
        </p>
        <p className="mt-1 text-sm text-neutral-400">{pieza.error}</p>
      </div>
    </div>
  );
}

function FilaNormal({ pieza }: { pieza: Extract<Paquete, { blocked: false }> }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-mono text-xs text-neutral-500">
          {pieza.id} · {pieza.date}
        </p>
        <EstadoBadge status={pieza.status} />
      </div>

      <p className="mt-2 text-base font-bold leading-snug text-white">{pieza.hook}</p>
      <p className="mt-1 text-sm text-neutral-400">{pieza.problem}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-neutral-400">
        <span className="inline-flex items-center gap-1 font-semibold text-white">
          <Sparkles className="h-3.5 w-3.5 text-[#d84955]" aria-hidden />
          {pieza.score}
        </span>
        <span>{pieza.feature}</span>
        {pieza.formats.length > 0 && <span>{pieza.formats.join(" · ")}</span>}
        {pieza.needsCapture && (
          <span className="inline-flex items-center gap-1 text-amber-300">
            <Camera className="h-3.5 w-3.5" aria-hidden />
            Captura real
          </span>
        )}
        <span className={pieza.qa === null ? "text-neutral-500" : pieza.qa.pass ? "text-emerald-300" : "text-rose-300"}>
          QA: {pieza.qa === null ? "sin revisar" : pieza.qa.pass ? "OK" : "no pasa"}
        </span>
      </div>
    </div>
  );
}
