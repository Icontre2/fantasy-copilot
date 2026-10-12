"use client";

import { Download } from "lucide-react";
import { Card, SectionTitle } from "./ui";

/**
 * Exportar: descarga de los CSV.
 *
 * Los CSV se generan en servidor. Estos enlaces son navegaciones normales, no
 * fetch: el navegador recibe `Content-Disposition: attachment` y guarda el
 * fichero directamente, sin pasar el contenido por memoria de la app.
 */
export function ExportView({ leagueId }: { leagueId: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Descargar datos</SectionTitle>

        <div className="space-y-3">
          <ExportLink
            href={`/api/fantasy/leagues/${leagueId}/export/full`}
            title="Todo el juego en un archivo"
            description="Todos los jugadores de LALIGA Fantasy: su dueño en tu liga con cláusula y blindaje, si están en el mercado con precio y pujas, y sus puntos jornada a jornada."
            destacado
          />
          <ExportLink
            href={`/api/fantasy/leagues/${leagueId}/export/teams`}
            title="Todos los equipos de la liga"
            description="Una fila por jugador: manager, equipo, valor, cláusula, puntos y estado."
          />
          <ExportLink
            href={`/api/fantasy/leagues/${leagueId}/export/market`}
            title="Mercado actual"
            description="Los jugadores a la venta ahora mismo, con precio de salida, expiración y tendencia de valor."
          />
        </div>
      </Card>

      <Card>
        <SectionTitle>Cómo leer «Todo el juego»</SectionTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-5 text-neutral-400 marker:text-[#7c3aed]">
          <li>
            <code>situation</code> dice dónde está cada jugador en tu liga: <code>owned</code> (en un
            equipo), <code>owned_on_market</code> (su dueño lo vende), <code>market</code> (lo vende la
            liga) o <code>free</code> (libre).
          </li>
          <li>
            Las columnas que empiezan por <code>calc_</code> son cálculos nuestros (puntos por millón,
            precio frente a valor, tendencia). Todas las demás son datos de LALIGA tal cual.
          </li>
          <li>
            <code>points_w1</code>, <code>points_w2</code>… son los puntos de cada jornada. Una celda
            vacía significa que no tiene puntuación publicada, no que hiciera cero.
          </li>
          <li>Se abre en Excel o Google Sheets; el separador es punto y coma.</li>
        </ul>
      </Card>

      <Card>
        <SectionTitle>Qué no traen estos CSV</SectionTitle>
        <p className="text-sm leading-5 text-neutral-400">
          Estas columnas se han pedido y <strong className="text-neutral-200">no se emiten</strong>,
          porque LALIGA no las publica en ningún endpoint. Se omiten en vez de salir siempre vacías,
          para que nadie construya un análisis sobre un dato que no existe:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-neutral-400 marker:text-[#7c3aed]">
          <li>
            <strong>Precio de adquisición</strong> y <strong>fecha de adquisición</strong> de cada
            jugador. El precio estimado de las compras detectadas sí está, pero en Economía, marcado
            como cálculo.
          </li>
          <li>
            <strong>Puja actual</strong> y <strong>quién puja</strong>. Solo es visible tu propia
            puja; las ajenas no se publican ni en vivo.
          </li>
          <li>
            <strong>Vendedor</strong> del mercado. La API solo da un tipo de entrada
            (<code>seller_kind</code>), no la identidad del manager que vende.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function ExportLink({
  href,
  title,
  description,
  destacado = false,
}: {
  href: string;
  title: string;
  description: string;
  destacado?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex min-h-14 items-center gap-3 rounded-2xl border p-3.5 active:scale-[.99] ${destacado ? "border-[#8b5cf6]/60 bg-[#7c3aed]/25" : "border-[#7c3aed]/25 bg-[#7c3aed]/10"}`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#7c3aed] text-white">
        <Download size={19} />
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-4 text-neutral-400">{description}</span>
      </span>
    </a>
  );
}
