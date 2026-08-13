"use client";

import { useState } from "react";
import { post } from "./api";
import type { Manager } from "./types";
import { Card, ErrorBox } from "./ui";

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
    <Card>
      <h1 className="mb-1 text-xl font-semibold">Entra con tu cuenta de LALIGA Fantasy</h1>
      <p className="mb-4 text-sm text-neutral-600">
        Consulta tu liga y gestiona tus propias pujas desde el mercado.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Contraseña</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>

        {error && <ErrorBox message={error} />}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-xs text-neutral-500">
        Tu contraseña se usa una sola vez para obtener el token de LALIGA y no se guarda en ningún
        sitio. Si entras a LALIGA con Google, Apple o Facebook, este método no funciona: esas cuentas
        no tienen contraseña propia.
      </p>
    </Card>
  );
}
