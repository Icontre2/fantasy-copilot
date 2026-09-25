"use client";

import { useEffect, useMemo, useState } from "react";
import { Crosshair, Lock } from "lucide-react";
import { getCacheado, post } from "./api";
import { buscarObjetivos, type FiltroDePosicionAtaque, type Objetivo, type OrdenDeAtaque } from "./ataque";
import { millions, shortDateTime } from "./format";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";
import type { DashboardResponse, Player, TeamsResponse } from "./types";
import { Empty, ErrorBox, Spinner } from "./ui";

/**
 * Ataque: a quién puedes clausular hoy con tu caja. Lógica en `ataque.ts`.
 *
 * El pago usa la MISMA ruta que Alertas, que antes de pagar vuelve a leer la
 * liga y rechaza si la cláusula o el dueño han cambiado, o si está blindado.
 */

const ORDENES: Array<{ id: OrdenDeAtaque; label: string; ayuda: string }> = [
  { id: "MEDIA", label: "Media", ayuda: "Los que más puntúan por partido." },
  { id: "PUNTOS", label: "Puntos", ayuda: "Los que más puntos llevan en la temporada." },
  { id: "SOBREPRECIO", label: "Ganga", ayuda: "Los que menos pagas por encima de su valor de mercado." },
];
const POSICIONES: Array<{ id: FiltroDePosicionAtaque; label: string }> = [
  { id: "TODAS", label: "Todas" }, { id: "POR", label: "POR" }, { id: "DEF", label: "DEF" }, { id: "MED", label: "MED" }, { id: "DEL", label: "DEL" },
];

export function AtaqueView({ data, leagueId, onChanged }: { data: TeamsResponse; leagueId: string; onChanged: () => void }) {
  const [yo, setYo] = useState<DashboardResponse["me"] | null>(null);
  const [errorYo, setErrorYo] = useState<string | null>(null);
  const [orden, setOrden] = useState<OrdenDeAtaque>("MEDIA");
  const [posicion, setPosicion] = useState<FiltroDePosicionAtaque>("TODAS");
  const [soloDisponibles, setSoloDisponibles] = useState(true);
  const [selected, setSelected] = useState<Player | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCacheado<DashboardResponse>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/dashboard`)
      .then((r) => { if (!cancelled) setYo(r.me); })
      .catch((e: unknown) => { if (!cancelled) setErrorYo(e instanceof Error ? e.message : "No se pudo leer tu caja."); });
    return () => { cancelled = true; };
  }, [leagueId]);

  const miCaja = yo ? yo.teamMoney ?? yo.estimatedCash : null;
  const cajaEstimada = yo?.teamMoney === undefined;
  const resultado = useMemo(
    () => (yo && miCaja !== null ? buscarObjetivos({ teams: Array.isArray(data.teams) ? data.teams : [], myManagerId: yo.manager.id, miCaja, ahora: new Date(), orden, posicion, soloDisponibles }) : null),
    [data.teams, yo, miCaja, orden, posicion, soloDisponibles],
  );

  async function pagar(o: Objetivo) {
    if (!window.confirm(`Vas a pagar ${millions(o.clausula)} por ${o.player.name} a ${o.owner.managerName}. Te quedarán ${millions(o.cajaTras)}. Es irreversible. ¿Continuar?`)) return;
    setBusy(o.player.id); setMessage(null);
    try {
      const r = await post<{ confirmed: boolean }>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/players/${encodeURIComponent(o.player.id)}/buyout`, { expectedClause: o.clausula, expectedOwnerId: o.owner.managerId });
      setMessage(r.confirmed ? `${o.player.name} es tuyo. LALIGA lo ha confirmado.` : "LALIGA respondió, pero el fichaje aún no aparece. Actualiza antes de repetir.");
      onChanged();
    } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo pagar la cláusula."); }
    finally { setBusy(null); }
  }

  if (errorYo) return <ErrorBox message={errorYo} />;
  if (!yo || miCaja === null || !resultado) return <Spinner label="Leyendo tu caja…" />;
  const ayuda = ORDENES.find((o) => o.id === orden)?.ayuda ?? "";

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#0f2a1f_0%,#123a2a_55%,#174a35_100%)] p-5 text-white shadow-[0_24px_70px_rgba(12,50,30,.25)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/55">Ataque</p>
          <p className="mt-2 text-[34px] font-bold leading-none tracking-[-.04em]">{resultado.ya.length} <span className="text-lg font-semibold text-white/60">{resultado.ya.length === 1 ? "cláusula a tu alcance" : "cláusulas a tu alcance"}</span></p>
          <p className="mt-2 text-sm leading-5 text-white/65">Jugadores de tus rivales que puedes pagar ya con tu caja de {cajaEstimada ? "≈ " : ""}{millions(miCaja)}.</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300"><Crosshair size={22} /></span>
      </div>
    </section>

    <div className="flex gap-2" aria-label="Ordenar">{ORDENES.map((o) => <button key={o.id} type="button" onClick={() => setOrden(o.id)} aria-pressed={orden === o.id} className={`min-h-11 grow rounded-2xl px-3 text-sm font-bold ${orden === o.id ? "bg-[#7c3aed] text-white" : "glass text-neutral-500"}`}>{o.label}</button>)}</div>
    <p className="px-1 text-[11px] leading-4 text-neutral-500">{ayuda}</p>
    <div className="flex gap-2" aria-label="Filtrar por posición">{POSICIONES.map((o) => <button key={o.id} type="button" onClick={() => setPosicion(o.id)} aria-pressed={posicion === o.id} className={`min-h-11 grow rounded-2xl px-2 text-xs font-bold ${posicion === o.id ? "bg-[#7c3aed] text-white" : "glass text-neutral-500"}`}>{o.label}</button>)}</div>
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl glass px-4 text-sm text-neutral-300">
      <span>Ocultar lesionados y sancionados</span>
      <input type="checkbox" checked={soloDisponibles} onChange={(e) => setSoloDisponibles(e.target.checked)} className="h-5 w-5 accent-[#7c3aed]" />
    </label>

    {message && <p className="rounded-2xl border border-white/10 bg-white/[.05] p-3 text-sm text-neutral-200" role="status">{message}</p>}

    {resultado.ya.length === 0
      ? <Empty>Con tu caja de hoy no llegas a ninguna cláusula libre con estos filtros.</Empty>
      : <div className="ll-stagger space-y-3">{resultado.ya.map((o) => <ObjetivoCard key={o.player.id} o={o} busy={busy === o.player.id} onPagar={() => pagar(o)} onSelect={setSelected} />)}</div>}

    {resultado.pronto.length > 0 && <section className="space-y-3">
      <h3 className="px-1 text-sm font-bold text-white">Blindados que podrás pagar</h3>
      {resultado.pronto.map((o) => <ObjetivoCard key={o.player.id} o={o} onSelect={setSelected} />)}
    </section>}

    <p className="rounded-2xl glass px-4 py-3 text-xs leading-5 text-neutral-500">
      {resultado.fueraDeAlcance > 0 ? `${resultado.fueraDeAlcance} ${resultado.fueraDeAlcance === 1 ? "jugador rival tiene" : "jugadores rivales tienen"} una cláusula por encima de tu caja. ` : ""}
      Cláusulas, blindajes y puntos son datos oficiales de LALIGA. {cajaEstimada ? "Tu caja no la publica LALIGA ahora mismo: se usa la reconstruida (≈). " : ""}
      Antes de pagar, el servidor vuelve a comprobar la cláusula, el dueño y el blindaje.
      {data.failedTeamIds?.length ? ` No se pudieron leer ${data.failedTeamIds.length} plantillas.` : ""}
    </p>
    {selected ? <PlayerDetails player={selected} onClose={() => setSelected(null)} /> : null}
  </div>;
}

function ObjetivoCard({ o, busy = false, onPagar, onSelect }: { o: Objetivo; busy?: boolean; onPagar?: () => void; onSelect: (p: Player) => void }) {
  const { player } = o;
  return <article className="rounded-[26px] border border-white/8 bg-[#0d0d10] p-4 shadow-[0_12px_36px_rgba(0,0,0,.22)]">
    <button type="button" onClick={() => onSelect(player)} className="flex w-full items-center gap-3 text-left">
      <PlayerImage player={player} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{player.name}</p>
        <p className="truncate text-xs text-neutral-500">{player.position} · {player.team} · de {o.owner.managerName}{player.status !== "ok" ? ` · ${ESTADO[player.status] ?? player.status}` : ""}</p>
      </div>
      <div className="text-right"><p className="text-sm font-bold tabular-nums text-white">{millions(o.clausula)}</p><p className="text-[10px] text-neutral-600">cláusula</p></div>
    </button>
    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
      <Dato label="Media" value={player.averagePoints?.toFixed(1).replace(".", ",") ?? "—"} />
      <Dato label="Sobre valor" value={`${o.sobreprecio >= 0 ? "+" : ""}${millions(o.sobreprecio)}`} />
      <Dato label="Te quedan" value={millions(o.cajaTras)} />
    </div>
    {o.blindado
      ? <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sky-500/12 px-2.5 py-1 text-[11px] font-bold text-sky-300 ring-1 ring-sky-500/25"><Lock size={13} />{o.blindadoHasta ? `Blindado hasta ${shortDateTime(o.blindadoHasta)}` : "Blindado, sin fecha publicada"}</p>
      : onPagar && <button type="button" onClick={onPagar} disabled={busy} className="mt-3 min-h-11 w-full rounded-2xl bg-emerald-500/15 text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/25 transition active:scale-[.99] disabled:opacity-50">{busy ? "Pagando…" : `Pagar cláusula · ${millions(o.clausula)}`}</button>}
  </article>;
}

const ESTADO: Record<string, string> = { doubtful: "duda", injured: "lesionado", suspended: "sancionado", out_of_league: "fuera de la liga" };

function Dato({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/[.04] px-3 py-2"><p className="text-[10px] text-neutral-500">{label}</p><p className="mt-0.5 font-bold tabular-nums text-white">{value}</p></div>;
}
