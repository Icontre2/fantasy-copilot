"use client";

import { CalendarDays, Download, Scale, TableProperties, Users, WalletCards } from "lucide-react";
import { CuentaView, type EstadoSocial } from "./CuentaView";
import type { Section } from "./types";

const ITEMS: Array<{ id: Section; label: string; description: string; icon: React.ReactNode }> = [
  { id: "economia", label: "Economía", description: "Caja y movimientos", icon: <WalletCards/> },
  { id: "onces", label: "Onces probables", description: "Fotos y porcentajes", icon: <Users/> },
  { id: "jornadas", label: "Jornadas", description: "Horarios y resultados", icon: <CalendarDays/> },
  { id: "comparar", label: "Comparar", description: "Jugador contra jugador", icon: <Scale/> },
  { id: "liga", label: "Liga completa", description: "Clasificación y plantillas", icon: <TableProperties/> },
  { id: "exportar", label: "Exportar", description: "Plantillas y mercado CSV", icon: <Download/> },
];

export function MoreView({ onSelect, social }: { onSelect: (section: Section) => void; social: EstadoSocial | null }) {
  return <div className="space-y-6"><div className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-neutral-500">Herramientas</p><h2 className="text-2xl font-bold tracking-tight text-white">Todo lo demás</h2></div><div className="grid grid-cols-2 gap-3">{ITEMS.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)} className="rounded-[24px] glass p-4 text-left transition active:scale-[.98]"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#7c3aed]/20 text-[#a78bfa]">{item.icon}</span><p className="mt-4 font-bold text-white">{item.label}</p><p className="mt-1 text-xs leading-4 text-neutral-500">{item.description}</p></button>)}</div></div><CuentaView social={social} /><p className="pb-2 text-center text-[11px] leading-4 text-neutral-500"><a href="/privacidad" className="underline underline-offset-2">Qué datos maneja LigaLab</a>{" · "}Herramienta independiente, no afiliada a LALIGA.</p></div>;
}
