"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { get } from "./api";
import { hasNativeLaligaOAuth, loginWithLaligaOnIOS } from "./mobile-auth";

type SessionState = { authenticated?: boolean };

/**
 * Solo existe visualmente dentro del contenedor iOS que registra LaligaOAuth.
 * En Safari, PWA, escritorio y Android devuelve null y no altera el login web.
 */
export default function NativeMobileLogin() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasNativeLaligaOAuth()) return;
    let cancelled = false;
    get<SessionState>("/api/fantasy/auth/session")
      .then((session) => {
        if (!cancelled && !session.authenticated) setVisible(true);
      })
      .catch(() => {
        if (!cancelled) setVisible(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  async function login() {
    setBusy(true);
    setError(null);
    try {
      await loginWithLaligaOnIOS();
      // FantasyApp volverá a leer la cookie HttpOnly recién creada.
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar el acceso.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[100] mx-auto max-w-md rounded-3xl border border-[#8b5cf6]/30 bg-[#15111f]/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#7c3aed] text-white">
          <KeyRound size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Acceso móvil a LALIGA Fantasy</p>
          <p className="mt-1 text-[11px] leading-4 text-neutral-400">
            Entra con Google, Apple o Facebook en la pantalla oficial de LALIGA. No tienes que copiar tokens ni usar un ordenador.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={login}
        disabled={busy}
        className="mt-4 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-[#18131f] disabled:opacity-50"
      >
        {busy ? "Abriendo LALIGA…" : "Entrar con Google, Apple o Facebook"}
      </button>

      {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-[11px] leading-4 text-red-300">{error}</p>}

      <p className="mt-3 flex gap-2 text-[10px] leading-4 text-neutral-500">
        <ShieldCheck size={14} className="mt-px shrink-0" />
        El código vuelve a LigaLab y el servidor crea la sesión; los tokens no se guardan en JavaScript.
      </p>
    </div>
  );
}
