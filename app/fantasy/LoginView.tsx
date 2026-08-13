"use client";

import { useState } from "react";
import { post } from "./api";
import type { Manager } from "./types";
import { ErrorBox } from "./ui";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";

/**
 * Login con la cuenta de LALIGA Fantasy.
 *
 * La contraseña se envía una vez a la ruta propia, que la intercambia por
 * tokens contra el login oficial de LALIGA y la descarta. Nunca se guarda ni
 * vuelve al navegador; lo único que queda es una cookie httpOnly con un id.
 *
 * No funciona con cuentas de Google, Apple ni Facebook: esas no tienen
 * contraseña en el proveedor de identidad de LALIGA. Se avisa antes de que el
 * usuario lo descubra con un error críptico.
 */
export function LoginView({ onLogin }: { onLogin: (manager: Manager) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { manager } = await post<{ manager: Manager }>("/api/fantasy/auth/login", {
        email,
        password,
      });
      setPassword("");
      onLogin(manager);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto mt-[8vh] w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-[0_28px_90px_rgba(10,18,45,.16)]">
      <div className="bg-[linear-gradient(145deg,#101a39,#1d3566)] p-6 text-white">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d6ff75] text-lg font-black text-[#101a39]">LL</span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-white/45">LigaLab</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.04em]">Tu liga, más clara.</h1>
        <p className="mt-2 text-sm leading-5 text-white/60">Consulta cajas, plantillas, alertas y mercado desde un único sitio.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 p-6">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Email</span>
          <span className="flex items-center gap-2 rounded-2xl bg-[#f3f5f8] px-3"><Mail size={17} className="text-neutral-400"/><input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-transparent py-3.5 outline-none"
          /></span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Contraseña</span>
          <span className="flex items-center gap-2 rounded-2xl bg-[#f3f5f8] px-3"><LockKeyhole size={17} className="text-neutral-400"/><input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-transparent py-3.5 outline-none"
          /></span>
        </label>

        {error && <ErrorBox message={error} />}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-[#101a39] px-4 py-4 font-bold text-white shadow-lg disabled:opacity-50"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <p className="flex gap-2 rounded-2xl bg-[#efffc9] p-3 text-[11px] leading-4 text-[#315408]"><ShieldCheck size={16} className="shrink-0"/>La contraseña se usa una vez y no se guarda. Las cuentas creadas con Google, Apple o Facebook no tienen contraseña propia.</p>
      </form>
    </section>
  );
}
