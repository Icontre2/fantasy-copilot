"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { post } from "./api";
import type { Manager } from "./types";
import { ErrorBox } from "./ui";

/**
 * Conectar LALIGA con su login oficial, pegando a mano la dirección de vuelta.
 *
 * LALIGA ya no deja entrar con email y contraseña desde apps externas, y su
 * login web solo devuelve a su propia app (`authredirect://…`). En un iPhone
 * esa dirección no se puede ver; en un ORDENADOR sí:
 *   - Chrome/Edge la escriben en la consola (F12 → Consola).
 *   - Firefox la deja en la barra de direcciones.
 * Se pega aquí, el servidor la canjea con el código que guardó al empezar
 * (`/api/fantasy/auth/mobile/start` → `/complete`) y queda abierta la sesión.
 * Si ya habías entrado con Google, además queda enlazada: desde ahí, en el
 * móvil basta con «Continuar con Google».
 *
 * Todo tiene que hacerse en el MISMO navegador y en menos de 15 minutos: el
 * código secreto del intento va en una cookie de este navegador.
 */
export function ConectarLaliga({ onLogin }: { onLogin: (manager: Manager) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [pegado, setPegado] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrirLogin() {
    setError(null);
    // La ventana se abre YA, en el mismo toque: si se abre después de una
    // espera, el navegador la toma por un anuncio y la bloquea.
    const ventana = window.open("about:blank", "_blank");
    try {
      const { authorizeUrl } = await post<{ authorizeUrl: string }>("/api/fantasy/auth/mobile/start");
      if (ventana) ventana.location.href = authorizeUrl;
      else window.location.href = authorizeUrl;
    } catch (caught) {
      ventana?.close();
      setError(caught instanceof Error ? caught.message : "No se pudo abrir el login de LALIGA.");
    }
  }

  async function conectar() {
    setBusy(true);
    setError(null);
    try {
      const { manager } = await post<{ manager: Manager }>("/api/fantasy/auth/mobile/complete", { callbackUrl: pegado });
      setPegado("");
      onLogin(manager);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo conectar con LALIGA.");
    } finally {
      setBusy(false);
    }
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="w-full rounded-2xl bg-[#17121f] px-4 py-4 text-sm font-black text-white shadow-sm">
        Conectar LALIGA desde un ordenador
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#7c3aed]/20 bg-[#f0eafe] p-4 text-[#17121f]">
      <div>
        <p className="text-sm font-bold text-[#4c1d95]">Conectar con el login oficial de LALIGA</p>
        <p className="mt-1 text-[11px] leading-4 text-[#6f6978]">
          Hazlo en un ordenador, todo en este mismo navegador y en menos de 15 minutos. Solo hace falta una vez: después,
          en el móvil entras con «Continuar con Google».
        </p>
      </div>
      <ol className="list-decimal space-y-1.5 pl-5 text-[12px] leading-4 text-[#3d3747]">
        <li>Si quieres entrar luego con Google en el móvil, pulsa antes «Continuar con Google» aquí arriba.</li>
        <li>
          <button type="button" onClick={abrirLogin} className="inline-flex items-center gap-1 font-bold text-[#6d28d9] underline underline-offset-2">
            Abre el login de LALIGA <ExternalLink size={12} />
          </button>{" "}
          y entra como siempre (email, Google…).
        </li>
        <li>
          Al terminar, esa pestaña se queda en blanco o da error: es lo esperado. Copia la dirección que empieza por{" "}
          <code className="rounded bg-white px-1 text-[11px]">authredirect://</code>:
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-[#5b5564]">
            <li><strong>Chrome o Edge:</strong> pulsa F12 → pestaña «Consola» → copia entera la línea que empieza por «Failed to launch».</li>
            <li><strong>Firefox:</strong> está en la barra de direcciones.</li>
          </ul>
        </li>
        <li>Pégala aquí y pulsa conectar.</li>
      </ol>
      <textarea
        value={pegado}
        onChange={(event) => setPegado(event.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="authredirect://com.lfp.laligafantasy?code=…"
        className="min-h-24 w-full resize-y rounded-xl border border-black/10 bg-white p-3 font-mono text-[11px] outline-none"
      />
      {error && <ErrorBox message={error} />}
      <button type="button" onClick={conectar} disabled={busy || !pegado.trim()} className="w-full rounded-xl bg-[#7c3aed] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "Conectando con LALIGA…" : "Conectar"}
      </button>
    </div>
  );
}
