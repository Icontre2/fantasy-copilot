"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { post } from "./api";

import { millions, shortDate, UNKNOWN } from "./format";
import type { MarketResponse } from "./types";
import { Empty } from "./ui";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";
import type { Player } from "./types";

type PositionFilter = "TODAS" | "POR" | "DEF" | "MED" | "DEL";
type SourceFilter = "TODOS" | "MERCADO" | "MANAGER";

/**
 * Criterios de orden. Cada uno es una METRICA REAL publicada por LALIGA.
 *
 * No hay "mejor fichaje" ni "puntos esperados": ordenar por algo obliga a tener
 * ese algo medido, y esas dos no existen. Ordenar por una cifra inventada seria
 * peor que no ordenar, porque el orden se lee como un ranking de calidad.
 */
type Orden = "CIERRE" | "SALIDA" | "VALOR" | "MEDIA";
const ORDENES: Array<{ id: Orden; label: string }> = [
  { id: "CIERRE", label: "Cierra antes" },
  { id: "SALIDA", label: "Precio" },
  { id: "VALOR", label: "Valor" },
  { id: "MEDIA", label: "Media" },
];

/**
 * "1 puja" y no "1 pujas". Cuando LALIGA no publica el numero se dice que no se
 * sabe, que no es lo mismo que decir que no hay ninguna.
 */
function pujas(numero: number | undefined): string {
  if (numero === undefined) return `${UNKNOWN} pujas`;
  return numero === 1 ? "1 puja" : `${numero} pujas`;
}

/** Horas que faltan para que expire, o `null` si LALIGA no publica la fecha. */
function horasParaCierre(expiresAt: string | undefined, now: number): number | null {
  if (!expiresAt) return null;
  const fin = Date.parse(expiresAt);
  if (Number.isNaN(fin)) return null;
  return (fin - now) / 3_600_000;
}

/**
 * Mercado: quién está a la venta ahora mismo. Solo lectura.
 *
 * No hay "puja recomendada" ni "chollo": eso era Copilot y está fuera del
 * producto. Lo que sí falta y no se puede añadir es la puja ajena — LALIGA no
 * publica ni el importe ni quién puja, ni siquiera en vivo. Solo se ve la tuya.
 */
export function MarketView({ data, leagueId, onChanged }: { data: MarketResponse; leagueId: string; onChanged: () => void }) {
  const [selected, setSelected] = useState<Player | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<PositionFilter>("TODAS");
  const [source, setSource] = useState<SourceFilter>("TODOS");
  const [orden, setOrden] = useState<Orden>("CIERRE");
  /*
   * El reloj vive en estado, no se lee en el render.
   *
   * Leerlo en el render es impuro y ademas dejaba el contador congelado: una
   * subasta que "cierra en 3 h" seguia diciendo lo mismo una hora despues, hasta
   * que algo provocara un repintado. Con un tick por minuto la cuenta atras baja
   * sola, que es lo unico que la hace util.
   */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const visible = useMemo(() => data.market.filter((entry) => {
    const matchesText = `${entry.player.name} ${entry.player.team}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesPosition = position === "TODAS" || entry.player.position === position;
    const isLeague = /laliga|market|mercado/i.test(entry.sellerKind);
    const matchesSource = source === "TODOS" || (source === "MERCADO" ? isLeague : !isLeague);
    return matchesText && matchesPosition && matchesSource;
  }).sort((a, b) => {
    if (orden === "SALIDA") return a.salePrice - b.salePrice;
    if (orden === "VALOR") return b.player.marketValue - a.player.marketValue;
    if (orden === "MEDIA") return b.player.averagePoints - a.player.averagePoints;
    // Por cierre: primero lo que expira antes. Lo que no tiene fecha va al final,
    // no al principio: sin fecha no es urgente, es desconocido.
    const ha = horasParaCierre(a.expiresAt, now);
    const hb = horasParaCierre(b.expiresAt, now);
    if (ha === null && hb === null) return 0;
    if (ha === null) return 1;
    if (hb === null) return -1;
    return ha - hb;
  }), [data.market, position, query, source, orden, now]);
  async function act(entry: MarketResponse["market"][number], action: "create" | "modify" | "cancel") {
    let amount: number | undefined;
    if (action !== "cancel") {
      const raw = window.prompt(action === "create" ? `Puja por ${entry.player.name} (euros)` : `Nueva puja por ${entry.player.name} (euros)`, String(entry.myBid?.amount ?? Math.max(entry.salePrice, entry.player.marketValue)));
      if (raw === null) return; amount = Number(raw.replace(/[^0-9]/g, ""));
      if (!Number.isSafeInteger(amount) || amount <= 0) { setMessage("Introduce un importe válido en euros."); return; }
    }
    const verb = action === "cancel" ? "cancelar" : action === "modify" ? "cambiar" : "realizar";
    if (!window.confirm(`¿Confirmas ${verb} la puja${amount ? ` de ${millions(amount)}` : ""} por ${entry.player.name}?`)) return;
    setBusy(entry.marketId); setMessage(null);
    try {
      const result = await post<{ confirmed: boolean }>(`/api/fantasy/leagues/${encodeURIComponent(leagueId)}/market/${encodeURIComponent(entry.marketId)}/bid`, { action, amount, expectedBidId: entry.myBid?.bidId, expectedBidAmount: entry.myBid?.amount });
      setMessage(result.confirmed ? "Operación confirmada por LALIGA." : "LALIGA respondió, pero no se pudo verificar todavía. Actualiza antes de repetir."); onChanged();
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo completar la puja."); }
    finally { setBusy(null); }
  }
  if (data.market.length === 0) {
    return <Empty>No hay ningún jugador a la venta en el mercado de esta liga ahora mismo.</Empty>;
  }

  return (
    <div className="space-y-3">
      <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-neutral-500">En vivo</p><h2 className="text-2xl font-bold tracking-tight text-white">Mercado · {visible.length}</h2></div>
      <label className="flex min-h-12 items-center gap-2 rounded-2xl glass px-4 text-neutral-400"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar jugador o equipo…" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-600"/></label>
      <div className="grid grid-cols-5 gap-1.5">{(["TODAS","POR","DEF","MED","DEL"] as PositionFilter[]).map((item) => <button key={item} type="button" onClick={() => setPosition(item)} aria-pressed={position === item} className={`min-h-11 rounded-xl px-1 text-[11px] font-bold ${position === item ? "bg-[#7c3aed] text-white" : "glass text-neutral-400"}`}>{item}</button>)}</div>
      <div className="grid grid-cols-3 gap-2">{([['TODOS','Todos'],['MERCADO','Liga'],['MANAGER','Managers']] as const).map(([id,label]) => <button key={id} type="button" onClick={() => setSource(id)} aria-pressed={source === id} className={`min-h-11 rounded-xl text-xs font-bold ${source === id ? "bg-[#7c3aed]/20 text-[#c4b5fd] ring-1 ring-[#7c3aed]" : "glass text-neutral-500"}`}>{label}</button>)}</div>
      {/*
        Las filas de filtros iban en scroll horizontal y el ultimo boton se veia
        cortado por el borde de la pantalla: parecia texto mal recortado, no un
        carrusel. Con `grid` cabe todo y no hay nada escondido.
      */}
      <div className="grid grid-cols-4 gap-1.5" aria-label="Ordenar">
        {ORDENES.map((item) => <button key={item.id} type="button" onClick={() => setOrden(item.id)} aria-pressed={orden === item.id} className={`min-h-11 rounded-xl px-1 text-[11px] font-bold ${orden === item.id ? "bg-white/10 text-white ring-1 ring-white/20" : "glass text-neutral-500"}`}>{item.label}</button>)}
      </div>
      {message && <p className="rounded-2xl glass p-4 text-sm text-neutral-200" role="status">{message}</p>}
      {visible.length === 0 ? <Empty>No hay jugadores que coincidan con estos filtros.</Empty> : visible.map((entry) => <article key={entry.marketId} className="rounded-[26px] glass p-4">
        <button type="button" onClick={() => setSelected(entry.player)} className="flex w-full items-center gap-3 text-left"><PlayerImage player={entry.player} size={58}/><div className="min-w-0 flex-1"><p className="truncate font-bold text-white">{entry.player.name}</p><p className="text-xs text-neutral-500">{entry.player.position} · {entry.player.team} · {pujas(entry.numberOfBids)}</p></div><div className="text-right"><p className="text-[10px] uppercase text-neutral-500">Salida</p><p className="font-bold text-white">{millions(entry.salePrice)}</p></div></button>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs"><MarketMetric label="Valor" value={millions(entry.player.marketValue)}/><MarketMetric label="Media" value={entry.player.averagePoints > 0 ? entry.player.averagePoints.toFixed(1) : UNKNOWN}/><MarketMetric label="Tu puja" value={entry.myBid ? millions(entry.myBid.amount) : UNKNOWN}/><MarketMetric label="Expira" value={shortDate(entry.expiresAt)}/></div>
        <Cierre horas={horasParaCierre(entry.expiresAt, now)}/>
        <div className="mt-3 flex gap-2">{entry.myBid ? <><button disabled={busy === entry.marketId} type="button" onClick={() => act(entry, "modify")} className="min-h-11 flex-1 rounded-2xl bg-[#7c3aed] px-3 text-sm font-bold text-white">Cambiar puja</button><button disabled={busy === entry.marketId} type="button" onClick={() => act(entry, "cancel")} className="min-h-11 rounded-2xl border border-red-500/30 px-4 text-sm font-semibold text-red-400">Cancelar</button></> : <button disabled={busy === entry.marketId} type="button" onClick={() => act(entry, "create")} className="min-h-12 w-full rounded-2xl bg-[#7c3aed] px-4 text-sm font-black text-white">Pujar ahora</button>}</div>
      </article>)}
      <p className="px-2 text-xs leading-5 text-neutral-400">
        &laquo;Pujas&raquo; es cuántas hay, no de quién ni de cuánto: LALIGA no publica las pujas
        ajenas. La columna &laquo;Tu puja&raquo; solo muestra la tuya.
      </p>
      {selected && <PlayerDetails player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MarketMetric({ label, value }: { label: string; value: string }) { return <div className="glass-soft rounded-2xl px-2 py-2"><p className="text-[10px] text-neutral-500">{label}</p><p className="mt-0.5 truncate font-bold text-white">{value}</p></div>; }

/**
 * Aviso de cierre proximo.
 *
 * Solo aparece cuando LALIGA publica `expirationDate` y quedan menos de 24 h:
 * un aviso permanente deja de avisar. El color va acompañado del texto con las
 * horas, porque el color solo no es una explicacion.
 */
function Cierre({ horas }: { horas: number | null }) {
  if (horas === null || horas > 24) return null;
  const vencido = horas <= 0;
  const urgente = horas <= 6;
  const tono = vencido
    ? "border-neutral-700 bg-white/[.03] text-neutral-500"
    : urgente
      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
      : "border-amber-500/30 bg-amber-500/10 text-amber-300";
  const texto = vencido
    ? "La subasta ya ha vencido"
    : horas < 1
      ? `Cierra en ${Math.max(1, Math.round(horas * 60))} min`
      : `Cierra en ${Math.round(horas)} h`;
  return <p className={`mt-2 rounded-xl border px-3 py-1.5 text-center text-[11px] font-semibold ${tono}`}>{texto}</p>;
}
