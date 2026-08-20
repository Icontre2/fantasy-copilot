"use client";

import { Link2, ShieldCheck, TriangleAlert } from "lucide-react";
import type { Proveedor } from "@/src/server/auth/providers";

/**
 * Enlazar tu cuenta de LALIGA con Google, Apple o Facebook.
 *
 * ── Por qué esto existe, y por qué aquí ─────────────────────────────────────
 * El enlace solo se puede guardar en un momento concreto: cuando vuelves del
 * proveedor teniendo YA la sesión de LALIGA abierta. Es la única petición en la
 * que el servidor tiene las dos mitades a la vez.
 *
 * Sin este botón ese momento no ocurriría nunca desde la interfaz: los botones
 * de Google solo salían en la pantalla de acceso, o sea justo cuando todavía no
 * hay sesión de LALIGA que enlazar. Por eso «entrar con Google» te identificaba
 * y luego te pedía la contraseña igual.
 */

export type EstadoSocial = {
  proveedores: Proveedor[];
  identificado: boolean;
  motivo?: string | null;
};

const NOMBRES: Record<Proveedor, string> = { google: "Google", apple: "Apple", facebook: "Facebook" };

export function CuentaView({ social }: { social: EstadoSocial | null }) {
  if (!social || social.proveedores.length === 0) return null;

  const puede = !social.motivo;

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-neutral-500">Tu cuenta</p>
        <h3 className="text-lg font-bold tracking-tight text-white">Entrar sin contraseña</h3>
      </div>

      <div className="rounded-[24px] glass p-4">
        <p className="text-sm leading-5 text-neutral-300">
          Enlaza ahora tu cuenta de LALIGA con {social.proveedores.map((p) => NOMBRES[p]).join(", ")} y la próxima
          vez entras de un toque. Solo hay que hacerlo una vez.
        </p>

        {puede ? (
          <div className="mt-3 grid gap-2">
            {social.proveedores.map((proveedor) => (
              <a
                key={proveedor}
                href={`/api/fantasy/auth/social/start?provider=${proveedor}`}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-bold text-white ring-1 ring-white/15 transition active:scale-[.98]"
              >
                <Link2 size={16} />
                Enlazar con {NOMBRES[proveedor]}
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-3 flex gap-2 rounded-2xl bg-amber-500/10 p-3 text-[11px] leading-4 text-amber-200">
            <TriangleAlert size={14} className="mt-px shrink-0" />
            <span>{social.motivo}</span>
          </p>
        )}

        <p className="mt-3 flex gap-2 text-[11px] leading-4 text-neutral-500">
          <ShieldCheck size={14} className="mt-px shrink-0 text-emerald-400" />
          <span>
            Lo que se guarda es el permiso de LALIGA, cifrado, y solo tú puedes leerlo. Tu contraseña no se guarda
            nunca, ni aquí ni en ningún otro sitio.
          </span>
        </p>
      </div>
    </section>
  );
}
