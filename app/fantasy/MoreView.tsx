"use client";

import { BellRing, Download, Scale, TableProperties, Users, WalletCards } from "lucide-react";
import type { Section } from "./types";

const ITEMS: Array<{ id: Section; label: string; description: string; icon: React.ReactNode }> = [
  { id: "alertas", label: "Alertas", description: "Cláusulas que se acercan", icon: <BellRing/> },
  { id: "economia", label: "Economía", description: "Caja y movimientos", icon: <WalletCards/> },
  { id: "onces", label: "Onces probables", description: "Fotos y porcentajes", icon: <Users/> },
  { id: "comparar", label: "Comparar", description: "Jugador contra jugador", icon: <Scale/> },
  { id: "liga", label: "Liga completa", description: "Clasificación y plantillas", icon: <TableProperties/> },
  { id: "exportar", label: "Exportar", description: "Plantillas y mercado CSV", icon: <Download/> },
];

export function MoreView({ onSelect }: { onSelect: (section: Section) => void }) {
  return <div className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-neutral-400">Herramientas</p><h2 className="text-2xl font-bold tracking-tight text-[#101a39]">Todo lo demás</h2></div><div className="grid grid-cols-2 gap-3">{ITEMS.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)} className="rounded-[24px] bg-white p-4 text-left shadow-[0_10px_35px_rgba(16,26,57,.07)] transition active:scale-[.98]"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#efffc9] text-[#101a39]">{item.icon}</span><p className="mt-4 font-bold text-[#101a39]">{item.label}</p><p className="mt-1 text-xs leading-4 text-neutral-400">{item.description}</p></button>)}</div></div>;
}
