"use client";

import { useState } from "react";
import { CalendarDays, Download, LogOut, Scale, TableProperties, Users, WalletCards } from "lucide-react";
import { post } from "./api";
import type { Section } from "./types";

const ITEMS: Array<{ id: Section; label: string; description: string; icon: React.ReactNode }> = [
  { id: "economia", label: "Economía", description: "Caja, ingresos y movimientos", icon: <WalletCards size={19}/> },
  { id: "onces", label: "Onces probables", description: "Fotos y porcentajes", icon: <Users size={19}/> },
  { id: "jornadas", label: "Jornadas", description: "Horarios y resultados", icon: <CalendarDays size={19}/> },
  { id: "comparar", label: "Comparar", description: "Jugador contra jugador", icon: <Scale size={19}/> },
  { id: "liga", label: "Liga completa", description: "Rivales, ranking y plantillas", icon: <TableProperties size={19}/> },
  { id: "exportar", label: "Exportar", description: "Plantillas y mercado CSV", icon: <Download size={19}/> },
];

export function MoreView({ onSelect }: { onSelect: (section: Section) => void; social?: unknown }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function logout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await post<{ authenticated: false }>("/api/fantasy/auth/logout");
      window.location.assign("/");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "No se pudo cerrar la sesión.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#a78bfa]">LigaLab</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-.035em] text-white">Más herramientas</h2>
          <p className="mt-1 text-sm text-neutral-500">Accesos secundarios de tu liga.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ITEMS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`min-h-36 overflow-hidden rounded-[26px] border p-4 text-left transition active:scale-[.98] ${index === 0 ? "border-[#8b5cf6]/30 bg-[linear-gradient(145deg,rgba(124,58,237,.22),rgba(255,255,255,.035))]" : "border-white/8 bg-white/[.035]"}`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#7c3aed]/18 text-[#a78bfa] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">{item.icon}</span>
              <p className="mt-4 font-bold text-white">{item.label}</p>
              <p className="mt-1 text-[11px] leading-4 text-neutral-500">{item.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-white/8 bg-white/[.03] p-4">
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 text-sm font-bold text-rose-300 transition active:scale-[.99] disabled:opacity-50"
        >
          <LogOut size={18} />
          {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
        {logoutError && <p className="mt-2 text-center text-xs text-rose-300">{logoutError}</p>}
      </section>

      <p className="pb-2 text-center text-[10px] leading-4 text-neutral-600">
        <a href="/privacidad" className="underline underline-offset-2">Qué datos maneja LigaLab</a>{" · "}Herramienta independiente, no afiliada a LALIGA.
      </p>
    </div>
  );
}
