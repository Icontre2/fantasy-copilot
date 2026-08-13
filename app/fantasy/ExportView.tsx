"use client";

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
        <SectionTitle>Qué no traen estos CSV</SectionTitle>
        <p className="text-sm text-neutral-600">
          Estas columnas se han pedido y <strong>no se emiten</strong>, porque LALIGA no las publica
          en ningún endpoint. Se omiten en vez de salir siempre vacías, para que nadie construya un
          análisis sobre un dato que no existe:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
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
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-neutral-200 p-3 hover:border-neutral-400 hover:bg-neutral-50"
    >
      <span className="block font-medium text-neutral-900">{title} ⭳</span>
      <span className="block text-sm text-neutral-600">{description}</span>
    </a>
  );
}
