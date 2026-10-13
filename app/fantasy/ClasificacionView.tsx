"use client";

import Image from "next/image";

/** Clasificación de LaLiga calculada con los resultados oficiales. */

type Fila = { team: { id: string; name: string; shortName: string; badge: string }; pj: number; g: number; e: number; p: number; gf: number; gc: number; dg: number; pts: number; racha: Array<"G" | "E" | "P"> };
export type ClasificacionResponse = { jornada: number; tabla: Fila[] };

const TONO = { G: "bg-emerald-400", E: "bg-neutral-400", P: "bg-rose-400" } as const;

export function ClasificacionView({ data }: { data: ClasificacionResponse }) {
  const tabla = Array.isArray(data.tabla) ? data.tabla : [];
  return <div className="space-y-4">
    <section className="glass-strong rounded-[28px] p-5 text-white">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#a78bfa]">LaLiga · jornada {data.jornada}</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Clasificación</h2>
    </section>
    <div className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[.03]">
      <div className="grid grid-cols-[1.5rem_1fr_2rem_2.5rem_2.5rem] gap-2 border-b border-white/8 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500"><span>#</span><span>Equipo</span><span className="text-right">PJ</span><span className="text-right">DG</span><span className="text-right">Pts</span></div>
      <ol className="ll-stagger">{tabla.map((f, i) => (
        <li key={f.team.id} className={`grid grid-cols-[1.5rem_1fr_2rem_2.5rem_2.5rem] items-center gap-2 px-3 py-2.5 text-sm ${i < 4 ? "border-l-2 border-sky-400" : i >= tabla.length - 3 ? "border-l-2 border-rose-400" : "border-l-2 border-transparent"}`}>
          <span className="text-xs font-bold tabular-nums text-neutral-500">{i + 1}</span>
          <span className="flex min-w-0 items-center gap-2">
            {f.team.badge ? <Image src={f.team.badge} alt="" width={22} height={22} unoptimized className="h-[22px] w-[22px] shrink-0 object-contain" /> : null}
            <span className="min-w-0"><span className="block truncate font-semibold text-white">{f.team.name}</span>
              <span className="mt-0.5 flex gap-0.5">{f.racha.map((r, k) => <span key={k} className={`h-1.5 w-3 rounded-full ${TONO[r]}`} title={r} />)}</span></span>
          </span>
          <span className="text-right tabular-nums text-neutral-400">{f.pj}</span>
          <span className="text-right tabular-nums text-neutral-400">{f.dg > 0 ? "+" : ""}{f.dg}</span>
          <span className="text-right font-black tabular-nums text-white">{f.pts}</span>
        </li>))}</ol>
    </div>
    <p className="rounded-2xl glass px-4 py-3 text-xs leading-5 text-neutral-500">Calculada con los resultados oficiales del calendario de LALIGA. En empate a puntos se ordena por diferencia de goles y goles a favor; la oficial mira antes el enfrentamiento directo. Las rayitas son los últimos 5 resultados.</p>
  </div>;
}
