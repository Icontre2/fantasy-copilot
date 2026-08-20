"use client";

import { ShieldOff, Wallet } from "lucide-react";
import { millions } from "./format";

/**
 * Qué hace LigaLab, enseñado antes de pedir nada.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 * Alguien recibe el enlace por WhatsApp, lo abre, y lo primero que se encuentra
 * es una aplicación que no conoce pidiéndole el email y la contraseña de
 * LALIGA. Ahí se cae la mayoría, y con razón: se le está pidiendo confianza
 * antes de haberle demostrado nada.
 *
 * Esto invierte el orden. Primero se ve la tarjeta que hace el trabajo —con la
 * cifra en rojo, que es lo que de verdad se entiende de un vistazo— y solo
 * después se pide entrar.
 *
 * ── Sobre los datos ─────────────────────────────────────────────────────────
 * Los nombres son inventados a propósito. Poner futbolistas reales con cifras
 * que no lo son sería fabricar datos sobre personas reales, y ademas cualquiera
 * que conozca el juego notaría que no cuadran. Lo que se enseña aquí es el
 * MECANISMO, que es lo que no tiene nadie más; el jugador concreto da igual.
 *
 * Va marcado como ejemplo en la propia tarjeta, no en una nota al pie.
 */

/** Cifras del ejemplo, en un sitio para que se lean como lo que son. */
const EJEMPLO = {
  jugador: "Delantero centro",
  detalle: "DEL · rival de tu liga",
  valor: 18_400_000,
  clausula: 21_000_000,
};

export function VistaPrevia() {
  const hueco = EJEMPLO.clausula - EJEMPLO.valor;

  return (
    <div className="border-b border-white/8 p-6">
      {/*
        Sin titulillo ni parrafo de introduccion: la cabecera de arriba ya lo ha
        dicho, y repetirlo con otras palabras solo aleja el acceso una pantalla
        mas. Lo que convence es la tarjeta, no otra frase sobre la tarjeta.
      */}
      <article className="rounded-[22px] border border-white/10 bg-white/[.04] p-3.5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[.06] text-[15px]">
            ⚽
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-white">{EJEMPLO.jugador}</p>
            <p className="truncate text-[11px] text-neutral-500">{EJEMPLO.detalle}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/[.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Ejemplo
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Dato label="Valor" valor={millions(EJEMPLO.valor)} />
          <Dato label="Cláusula" valor={millions(EJEMPLO.clausula)} acento />
        </div>

        {/* La cifra que da sentido a todo lo demás, y por eso va en rojo. */}
        <p className="mt-2 flex items-baseline justify-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-center leading-4 ring-1 ring-rose-500/25">
          <span className="text-[11px] text-rose-300/80">Faltan</span>
          <span className="text-sm font-bold tabular-nums text-rose-400">{millions(hueco)}</span>
          <span className="text-[11px] text-rose-300/80">para la cláusula</span>
        </p>

        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] leading-4 text-emerald-400">
          <ShieldOff size={13} className="shrink-0" />
          Desbloqueada ahora: se puede pagar
        </p>
      </article>

      <ul className="mt-4 space-y-2.5">
        <Punto icono={<Wallet size={14} />}>
          <strong className="text-neutral-200">La caja de cada rival, reconstruida.</strong> Sumando su historial
          de fichajes y ventas. Sale marcada con <span className="text-[#a78bfa]">≈</span> cuando es estimación,
          porque lo es.
        </Punto>
        <Punto>
          <strong className="text-neutral-200">Ordenado por cuándo puedes fichar</strong>, no por lo grave que
          parezca: primero las que ya se pueden pagar.
        </Punto>
        <Punto>
          <strong className="text-neutral-200">Sin recomendaciones inventadas.</strong> Si un dato no se sabe, sale
          un guion; no un número puesto por rellenar.
        </Punto>
      </ul>

      <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[.14em] text-neutral-600">
        Conecta tu cuenta para verlo con tu liga
      </p>
    </div>
  );
}

function Dato({ label, valor, acento = false }: { label: string; valor: string; acento?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-0.5 text-[15px] font-bold tabular-nums ${acento ? "text-[#a78bfa]" : "text-white"}`}>
        {valor}
      </p>
    </div>
  );
}

function Punto({ icono, children }: { icono?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-[12px] leading-4 text-neutral-400">
      <span className="mt-px shrink-0 text-neutral-600">{icono ?? <span className="block h-3.5 w-3.5 text-center">·</span>}</span>
      <span>{children}</span>
    </li>
  );
}
