"use client";

import { millions, shortDate, UNKNOWN } from "./format";
import type { MarketResponse } from "./types";
import { Card, Empty, SectionTitle, TableWrap, Td, Th } from "./ui";

/**
 * Mercado: quién está a la venta ahora mismo. Solo lectura.
 *
 * No hay "puja recomendada" ni "chollo": eso era Copilot y está fuera del
 * producto. Lo que sí falta y no se puede añadir es la puja ajena — LALIGA no
 * publica ni el importe ni quién puja, ni siquiera en vivo. Solo se ve la tuya.
 */
export function MarketView({ data }: { data: MarketResponse }) {
  if (data.market.length === 0) {
    return <Empty>No hay ningún jugador a la venta en el mercado de esta liga ahora mismo.</Empty>;
  }

  return (
    <Card>
      <SectionTitle>Mercado ({data.market.length})</SectionTitle>
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
              <Th>Expira</Th>
            </tr>
          </thead>
          <tbody>
            {data.market.map((entry) => (
              <tr key={entry.marketId}>
                <Td className="font-medium">{entry.player.name}</Td>
                <Td>{entry.player.position}</Td>
                <Td>{entry.player.team}</Td>
                <Td align="right">{millions(entry.player.marketValue)}</Td>
                <Td align="right">{millions(entry.salePrice)}</Td>
                <Td align="right">{entry.numberOfBids ?? UNKNOWN}</Td>
                <Td align="right">{entry.myBid ? millions(entry.myBid.amount) : UNKNOWN}</Td>
                <Td>{shortDate(entry.expiresAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <p className="mt-3 text-xs text-neutral-500">
        &laquo;Pujas&raquo; es cuántas hay, no de quién ni de cuánto: LALIGA no publica las pujas
        ajenas. La columna &laquo;Tu puja&raquo; solo muestra la tuya.
      </p>
    </Card>
  );
}
