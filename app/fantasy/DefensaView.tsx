"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Lock, ShieldAlert, ShieldCheck, ShieldQuestion, SlidersHorizontal } from "lucide-react";
import { getCacheado } from "./api";
import { analizarDefensa, compradoresDeLiga, costeDeSubida, quienesPueden, resumirDefensa, type Comprador, type Defensa, type NivelDeDefensa } from "./defensa";
import { millions, shortDateTime } from "./format";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";
import type { DashboardResponse, EconomyResponse, ManagerEconomy, Player } from "./types";
import { Empty, ErrorBox, Spinner } from "./ui";

/**
 * Defensa: quién puede quitarte a cada jugador hoy, y cuánto cuesta impedirlo.
 *
 * Cruza dos cosas que ya estaban en la app por separado —las cláusulas de tu
 * plantilla (Inicio) y la caja de cada rival (Economía)— sin pedir nada nuevo a
 * LALIGA. La lógica vive en `defensa.ts`, que es donde está probada.
 *
 * No sube ninguna cláusula: eso se hace en LALIGA Fantasy. Aquí solo se calcula.
 */

const NIVEL: Record<NivelDeDefensa, { etiqueta: string; tono: string; icono: React.ReactNode }> = {
  EXPUESTO: { etiqueta: "Te lo pueden quitar", tono: "bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/25", icono: <ShieldAlert size={14} /> },
  BLINDADO: { etiqueta: "Blindado", tono: "bg-sky-500/12 text-sky-300 ring-1 ring-sky-500/25", icono: <Lock size={14} /> },
  SEGURO: { etiqueta: "Nadie llega", tono: "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/25", icono: <ShieldCheck size={14} /> },
  SIN_CLAUSULA: { etiqueta: "Sin cláusula publicada", tono: "bg-white/[.06] text-neutral-400", icono: <ShieldQuestion size={14} /> },
};

export function DefensaView({ data }: { data: DashboardResponse }) {
  const [economias, setEconomias] = useState<ManagerEconomy[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Player | null>(null);
  const leagueId = data.league?.id;

  useEffect(() => {
    if (!leagueId) return;
    let cancelled = false;
    getCacheado<EconomyResponse>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/economy`)
      .then((r) => { if (!cancelled) setEconomias(Array.isArray(r.economies) ? r.economies : []); })
      // Sin economía se sigue con la caja aproximada que ya trae el resumen.
      .catch((e: unknown) => { if (!cancelled) { setEconomias([]); setError(e instanceof Error ? e.message : "No se pudo reconstruir la caja de los rivales."); } });
    return () => { cancelled = true; };
  }, [leagueId]);

  const competitors = useMemo(() => (Array.isArray(data.competitors) ? data.competitors : []), [data.competitors]);
  const compradores = useMemo(() => compradoresDeLiga(competitors, economias ?? []), [competitors, economias]);
  const miEconomia = economias?.find((e) => e.managerId === data.me?.manager?.id);
  const miCaja = data.me?.teamMoney ?? miEconomia?.cajaReconstruida ?? null;
  const miCajaEstimada = data.me?.teamMoney === undefined;
  const misJugadores = data.me?.players;
  const defensas = useMemo(
    () => analizarDefensa(Array.isArray(misJugadores) ? misJugadores : [], compradores, miCaja, new Date()),
    [misJugadores, compradores, miCaja],
  );
  const resumen = resumirDefensa(defensas);

  if (!data?.me?.teamId) return <ErrorBox message="LALIGA no ha devuelto tu equipo en esta liga. Vuelve a entrar en unos minutos." />;
  if (economias === null) return <Spinner label="Cruzando tus cláusulas con la caja de cada rival…" />;

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#2a0f1a_0%,#3b1224_55%,#4c1630_100%)] p-5 text-white shadow-[0_24px_70px_rgba(60,12,30,.25)]">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">Defensa de tu plantilla</p>
      <p className="mt-2 text-[34px] font-bold leading-none tracking-[-.04em]">{resumen.expuestos} <span className="text-lg font-semibold text-white/60">{resumen.expuestos === 1 ? "jugador expuesto" : "jugadores expuestos"}</span></p>
      <p className="mt-2 text-sm leading-5 text-white/65">
        {resumen.expuestos > 0
          ? <>Algún rival tiene caja para pagar su cláusula hoy. Valen {millions(resumen.valorExpuesto)} en total.</>
          : <>Con la caja de hoy, ningún rival puede pagar la cláusula de tus jugadores sin blindar.</>}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Cifra label="Blindados" value={resumen.blindados} />
        <Cifra label="Seguros" value={resumen.seguros} />
        <Cifra label="Tu caja" texto={miCaja === null ? "—" : `${miCajaEstimada ? "≈ " : ""}${millions(miCaja)}`} />
      </div>
    </section>

    {error && <ErrorBox message={`${error} Se usa la caja aproximada de cada rival.`} />}
    {compradores.length === 0 && <Empty>No se conoce la caja de ningún rival, así que no se puede saber quién puede pagar qué.</Empty>}

    {defensas.length === 0
      ? <Empty>Tu plantilla está vacía.</Empty>
      : <div className="ll-stagger space-y-3">{defensas.map((d) => <DefensaCard key={d.player.id} defensa={d} compradores={compradores} miCaja={miCaja} onSelect={setSelected} />)}</div>}

    <p className="rounded-2xl glass px-4 py-3 text-xs leading-5 text-neutral-500">
      La cláusula y el blindaje son oficiales. La caja de los rivales es <strong>estimada</strong> (≈) salvo que LALIGA la publique:
      parte de 100 M€ y suma ventas y puntos, resta compras y cláusulas subidas. El coste de subir una cláusula usa la regla de
      LALIGA Fantasy de 1 € de caja por cada 2 € de cláusula. La subida se hace en LALIGA Fantasy; LigaLab no la ejecuta.
    </p>
    {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)} /> : null}
  </div>;
}

function DefensaCard({ defensa, compradores, miCaja, onSelect }: { defensa: Defensa; compradores: Comprador[]; miCaja: number | null; onSelect: (p: Player) => void }) {
  const [simulando, setSimulando] = useState(false);
  const { player, nivel, clausula, blindadoHasta, pueden, margen, proteccion } = defensa;
  const estilo = NIVEL[nivel];
  const aprox = (lista: Comprador[]) => (lista.some((c) => c.estimado) ? "≈ " : "");

  return <article className="rounded-[26px] border border-white/8 bg-[#0d0d10] p-4 shadow-[0_12px_36px_rgba(0,0,0,.22)]">
    <button type="button" onClick={() => onSelect(player)} className="flex w-full items-center gap-3 text-left">
      <PlayerImage player={player} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{player.name}</p>
        <p className="truncate text-xs text-neutral-500">{player.position} · {player.team} · valor {millions(player.marketValue)}</p>
      </div>
      <div className="text-right"><p className="text-sm font-bold tabular-nums text-white">{millions(clausula)}</p><p className="text-[10px] text-neutral-600">cláusula</p></div>
    </button>

    <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${estilo.tono}`}>{estilo.icono}{estilo.etiqueta}{nivel === "BLINDADO" && blindadoHasta ? ` hasta ${shortDateTime(blindadoHasta)}` : ""}</p>

    {nivel === "EXPUESTO" && <p className="mt-2 text-xs leading-5 text-neutral-400">
      Pueden pagarla: {pueden.map((c, i) => <Fragment key={c.managerId}>{i > 0 && ", "}<span className="font-semibold text-neutral-200">{c.nombre} ({c.estimado ? "≈ " : ""}{millions(c.poder)})</span></Fragment>)}.
    </p>}
    {nivel === "BLINDADO" && pueden.length > 0 && <p className="mt-2 text-xs leading-5 text-neutral-400">Cuando se levante, con la caja de hoy podrían pagarla {pueden.length} {pueden.length === 1 ? "rival" : "rivales"}: {pueden.map((c) => c.nombre).join(", ")}.</p>}
    {nivel === "SEGURO" && margen !== null && <p className="mt-2 text-xs leading-5 text-neutral-400">Al rival con más caja le faltan {aprox(compradores.slice(0, 1))}{millions(margen)} para pagarla.</p>}

    {proteccion && nivel === "EXPUESTO" && <div className="mt-3 rounded-2xl bg-white/[.04] px-3 py-2.5 text-xs leading-5 text-neutral-300">
      Para que nadie llegue hoy: súbela a <strong className="text-white">{aprox(compradores)}{millions(proteccion.clausulaObjetivo)}</strong>.
      Te cuesta <strong className="text-white">{aprox(compradores)}{millions(proteccion.coste)}</strong> de caja
      {proteccion.asequible === false ? <span className="text-rose-300"> — más de lo que tienes.</span> : proteccion.asequible === true ? "." : " (tu caja no se conoce)."}
    </div>}

    {clausula !== null && compradores.length > 0 && <>
      <button type="button" onClick={() => setSimulando((v) => !v)} aria-expanded={simulando} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[.03] text-xs font-bold text-neutral-300">
        <SlidersHorizontal size={15} /> {simulando ? "Cerrar simulador" : "Simular subida de cláusula"}
      </button>
      {simulando && <Simulador clausula={clausula} compradores={compradores} miCaja={miCaja} />}
    </>}
  </article>;
}

function Simulador({ clausula, compradores, miCaja }: { clausula: number; compradores: Comprador[]; miCaja: number | null }) {
  const paso = 100_000;
  const masRico = compradores[0]?.poder ?? clausula;
  // Hasta un 50% por encima del rival más rico, para poder ver el margen.
  const maximo = Math.max(clausula + paso * 10, Math.ceil((masRico * 1.5) / paso) * paso);
  const [objetivo, setObjetivo] = useState(clausula);
  const coste = costeDeSubida(clausula, objetivo);
  const pueden = quienesPueden(objetivo, compradores);
  const aprox = compradores.some((c) => c.estimado) ? "≈ " : "";

  return <div className="mt-3 space-y-3 rounded-2xl bg-white/[.04] p-3">
    <label className="block">
      <span className="flex items-baseline justify-between text-xs text-neutral-400"><span>Nueva cláusula</span><strong className="text-base tabular-nums text-white">{millions(objetivo)}</strong></span>
      <input type="range" min={clausula} max={maximo} step={paso} value={objetivo} onChange={(e) => setObjetivo(Number(e.target.value))} className="mt-2 w-full accent-[#7c3aed]" aria-label="Nueva cláusula" />
    </label>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-xl bg-white/[.05] px-3 py-2"><p className="text-neutral-500">Te cuesta</p><p className={`mt-0.5 font-bold tabular-nums ${miCaja !== null && coste > miCaja ? "text-rose-300" : "text-white"}`}>{millions(coste)}</p></div>
      <div className="rounded-xl bg-white/[.05] px-3 py-2"><p className="text-neutral-500">Podrían pagarla</p><p className={`mt-0.5 font-bold ${pueden.length > 0 ? "text-rose-300" : "text-emerald-300"}`}>{pueden.length === 0 ? "Nadie" : `${aprox}${pueden.length} ${pueden.length === 1 ? "rival" : "rivales"}`}</p></div>
    </div>
    {pueden.length > 0 && <p className="text-[11px] leading-4 text-neutral-500">{pueden.map((c) => c.nombre).join(", ")}</p>}
  </div>;
}

function Cifra({ label, value, texto }: { label: string; value?: number; texto?: string }) {
  return <div className="rounded-2xl bg-white/10 px-2 py-2"><p className="text-[10px] text-white/55">{label}</p><p className="mt-0.5 text-sm font-bold tabular-nums">{texto ?? value}</p></div>;
}
