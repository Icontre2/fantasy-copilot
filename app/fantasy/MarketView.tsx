"use client";

import { useState } from "react";
import { post } from "./api";

import { millions, shortDate, UNKNOWN } from "./format";
import type { MarketResponse } from "./types";
import { Card, Empty, SectionTitle, TableWrap, Td, Th } from "./ui";
import { PlayerDetails } from "./PlayerDetails";
import { PlayerImage } from "./PlayerImage";
import type { Player } from "./types";

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
    <Card>
      <SectionTitle>Mercado ({data.market.length})</SectionTitle>
      {message && <p className="mb-3 rounded-lg bg-neutral-100 p-3 text-sm" role="status">{message}</p>}
      <TableWrap>
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr>
              <Th>Jugador</Th>
              <Th>Pos</Th>
              <Th>Equipo</Th>
              <Th align="right">Valor</Th>
              <Th align="right">Precio salida</Th>
              <Th align="right">Pujas</Th>
              <Th align="right">Tu puja</Th>
              <Th>Expira</Th><Th>Acción</Th>
            </tr>
          </thead>
          <tbody>
            {data.market.map((entry) => (
              <tr key={entry.marketId}>
                <Td className="font-medium"><button type="button" onClick={() => setSelected(entry.player)} className="flex items-center gap-2 text-left hover:underline"><PlayerImage player={entry.player} size={38} />{entry.player.name}</button></Td>
                <Td>{entry.player.position}</Td>
                <Td>{entry.player.team}</Td>
                <Td align="right">{millions(entry.player.marketValue)}</Td>
                <Td align="right">{millions(entry.salePrice)}</Td>
                <Td align="right">{entry.numberOfBids ?? UNKNOWN}</Td>
                <Td align="right">{entry.myBid ? millions(entry.myBid.amount) : UNKNOWN}</Td>
                <Td>{shortDate(entry.expiresAt)}</Td><Td><div className="flex gap-1">{entry.myBid ? <><button disabled={busy === entry.marketId} type="button" onClick={() => act(entry, "modify")} className="rounded-lg bg-neutral-900 px-2 py-1 text-xs text-white">Cambiar</button><button disabled={busy === entry.marketId} type="button" onClick={() => act(entry, "cancel")} className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700">Cancelar</button></> : <button disabled={busy === entry.marketId} type="button" onClick={() => act(entry, "create")} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white">Pujar</button>}</div></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <p className="mt-3 text-xs text-neutral-500">
        &laquo;Pujas&raquo; es cuántas hay, no de quién ni de cuánto: LALIGA no publica las pujas
        ajenas. La columna &laquo;Tu puja&raquo; solo muestra la tuya.
      </p>
      {selected && <PlayerDetails player={selected} onClose={() => setSelected(null)} />}
    </Card>
  );
}
