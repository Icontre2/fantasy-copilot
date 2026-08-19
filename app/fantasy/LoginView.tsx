"use client";

import { useState } from "react";
import { post } from "./api";
import type { DiagnosticoDeSesion, Manager, Proveedor } from "./types";
import { ErrorBox } from "./ui";
import { Clock, ExternalLink, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

/**
 * Login con la cuenta de LALIGA Fantasy.
 *
 * La contraseña se envía una vez a la ruta propia, que la intercambia por
 * tokens contra el login oficial de LALIGA y la descarta. Nunca se guarda ni
 * vuelve al navegador; lo único que queda es una cookie httpOnly con un id.
 *
 * Las cuentas creadas con Google, Apple o Facebook no tienen contraseña propia
 * en B2C. Para ellas se ofrece debajo la importación de la respuesta de token
 * que entrega el login oficial de LALIGA.
 */
export function LoginView({
  onLogin,
  sesion,
  social,
  errorDeAcceso,
}: {
  onLogin: (manager: Manager) => void;
  /** Cuánto va a durar la sesión. Solo se avisa si va a durar poco. */
  sesion?: DiagnosticoDeSesion | null;
  /** Qué proveedores hay activos, y si ya te has identificado con alguno. */
  social?: { proveedores: Proveedor[]; identificado: boolean; motivo?: string | null } | null;
  /** Por qué falló el último acceso con proveedor, si falló. */
  errorDeAcceso?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSocialToken, setShowSocialToken] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  /*
   * El error del acceso con proveedor llega ya resuelto desde el servidor. Se
   * usa mientras el usuario no haya intentado nada más: en cuanto escribe y
   * pulsa «entrar», manda lo que diga ESE intento y no el anterior.
   */
  const aVista = error ?? errorDeAcceso ?? null;

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

  async function submitImportedToken() {
    if (!tokenInput.trim()) {
      setTokenError("Pega primero la respuesta JSON del login de LALIGA.");
      return;
    }

    setTokenBusy(true);
    setTokenError(null);
    try {
      const { manager } = await post<{ manager: Manager }>("/api/fantasy/auth/token", {
        token: tokenInput,
      });
      setTokenInput("");
      onLogin(manager);
    } catch (caught) {
      setTokenError(caught instanceof Error ? caught.message : "No se pudo validar esa sesión de LALIGA.");
    } finally {
      setTokenBusy(false);
    }
  }

  return (
    <section className="mx-auto mt-[8vh] w-full max-w-md overflow-hidden rounded-[32px] glass">
      <div className="bg-[linear-gradient(145deg,#17121f,#32175d)] p-6 text-white">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7c3aed] text-lg font-black text-white">LL</span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-white/45">LigaLab</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.04em]">Tu liga, más clara.</h1>
        <p className="mt-2 text-sm leading-5 text-white/60">Consulta cajas, plantillas, alertas y mercado desde un único sitio.</p>
      </div>

      {/*
        Este bloque identifica al usuario EN ESTA WEB mediante Supabase. No
        sustituye el login de LALIGA: la primera vez sigue haciendo falta enlazar
        la cuenta del juego. Solo se muestra cuando el proveedor está realmente
        activo en Supabase.
      */}
      {social && social.proveedores.length > 0 && !social.identificado && (
        <div className="border-b border-white/8 p-6 pb-5">
          <div className="space-y-2">
            {social.proveedores.map((proveedor) => (
              <BotonProveedor key={proveedor} proveedor={proveedor} />
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] leading-4 text-neutral-500">
            Esto te identifica en LigaLab. Para enlazar LALIGA Fantasy hace falta una sesión válida del juego.
          </p>
          <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[.14em] text-neutral-600">
            o con tu cuenta de LALIGA
          </p>
        </div>
      )}

      {/*
        Cuando NO hay botones, se dice por qué.

        Antes este hueco se quedaba mudo: ni botones ni explicación, y quien
        monta el despliegue no tenía forma de saber si faltaba una variable, si
        faltaba encender el proveedor en Supabase, o si la app no lo llevaba.
        Son tres cosas distintas y se arreglan en tres sitios distintos.

        Se nombra el fichero o el panel, nunca un valor. Y se enseña como nota
        gris, no como error rojo: para quien solo quiere entrar con su
        contraseña esto no es un fallo, es una función que este despliegue
        todavía no ofrece.
      */}
      {social && social.proveedores.length === 0 && social.motivo && (
        <div className="border-b border-white/8 px-6 py-4">
          <p className="text-[11px] leading-4 text-neutral-500">
            <strong className="text-neutral-400">Entrar con Google, Apple o Facebook está sin configurar.</strong>{" "}
            {social.motivo}
          </p>
        </div>
      )}

      {social?.identificado && (
        <div className="border-b border-white/8 p-6 pb-5">
          <p className="rounded-2xl bg-[#7c3aed]/15 p-3 text-[12px] leading-4 text-[#c4b5fd]">
            <strong>Ya te has identificado en LigaLab.</strong> Ahora conecta la cuenta de LALIGA Fantasy con
            email y contraseña o, si la creaste con Google, Apple o Facebook, usa el acceso social de abajo.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 p-6">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Email</span>
          <span className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3"><Mail size={17} className="text-neutral-500"/><input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-transparent py-3.5 text-white outline-none"
          /></span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">Contraseña</span>
          <span className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3"><LockKeyhole size={17} className="text-neutral-500"/><input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-transparent py-3.5 text-white outline-none"
          /></span>
        </label>

        {aVista && <ErrorBox message={aVista} />}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-[#7c3aed] px-4 py-4 font-bold text-white shadow-lg disabled:opacity-50"
        >
          {busy ? "Entrando…" : social?.identificado ? "Conectar mi cuenta de LALIGA" : "Entrar"}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowSocialToken((current) => !current);
            setTokenError(null);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-white/[.07]"
          aria-expanded={showSocialToken}
        >
          <KeyRound size={17} />
          Mi cuenta usa Google, Apple o Facebook
        </button>

        {showSocialToken && (
          <div className="space-y-3 rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 p-4">
            <div>
              <p className="text-sm font-bold text-[#ddd6fe]">Conectar una cuenta social de LALIGA</p>
              <p className="mt-1 text-[11px] leading-4 text-neutral-300">
                LALIGA no permite a una web externa recibir su callback social. La alternativa segura es iniciar
                sesión en la web oficial y pegar aquí la respuesta de token que LALIGA te entrega.
              </p>
            </div>

            <ol className="list-decimal space-y-1.5 pl-4 text-[11px] leading-4 text-neutral-300">
              <li>En un ordenador, abre LALIGA e inicia sesión con Google, Apple o Facebook.</li>
              <li>Abre F12 → Network/Red y activa “Preserve log”.</li>
              <li>Filtra por <code className="rounded bg-black/30 px-1 py-0.5">token?p=B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN</code>.</li>
              <li>Abre esa petición → Response/Respuesta y copia el JSON completo.</li>
            </ol>

            <a
              href="https://miliga.laliga.com/"
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-[#1f1f1f]"
            >
              Abrir acceso oficial de LALIGA <ExternalLink size={14} />
            </a>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                Respuesta JSON de LALIGA
              </span>
              <textarea
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                placeholder={'{"access_token":"…","refresh_token":"…"}'}
                className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/25 p-3 font-mono text-[11px] leading-4 text-white outline-none focus:border-[#8b5cf6]"
              />
            </label>

            {tokenError && <ErrorBox message={tokenError} />}

            <button
              type="button"
              onClick={submitImportedToken}
              disabled={tokenBusy || !tokenInput.trim()}
              className="w-full rounded-xl bg-[#7c3aed] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {tokenBusy ? "Validando con LALIGA…" : "Conectar esta sesión"}
            </button>

            <p className="text-[10px] leading-4 text-neutral-500">
              El token no se guarda en localStorage ni se registra: el servidor lo valida con LALIGA y lo convierte
              en una cookie HttpOnly. En iPhone/iPad Safari no hay DevTools; el acceso social automático allí requiere
              una app nativa que pueda recibir el callback de LALIGA.
            </p>
          </div>
        )}

        <p className="flex gap-2 rounded-2xl bg-emerald-500/10 p-3 text-[11px] leading-4 text-emerald-300">
          <ShieldCheck size={16} className="mt-px shrink-0" />
          <span>
            La contraseña se usa una vez y no se guarda. Si tu cuenta <strong>de LALIGA Fantasy</strong> nació con
            Google, Apple o Facebook, usa el acceso social de arriba en vez de una contraseña que esa cuenta no tiene.
          </span>
        </p>

        {sesion?.degradado && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-4 text-amber-200">
            <p className="flex items-center gap-2 font-bold">
              <Clock size={14} className="shrink-0" />
              {sesion.titulo} · durará {sesion.duracion}
            </p>
            <p className="mt-1.5">{sesion.explicacion}</p>
            {sesion.arreglo && <p className="mt-1.5 text-amber-200/80">{sesion.arreglo}</p>}
          </div>
        )}
      </form>
    </section>
  );
}

/**
 * Un botón por proveedor para identificarse en LigaLab mediante Supabase.
 * Es un enlace real para que el navegador termine en el proveedor.
 */
function BotonProveedor({ proveedor }: { proveedor: Proveedor }) {
  const estilo: Record<Proveedor, string> = {
    google: "bg-white text-[#1f1f1f]",
    apple: "bg-black text-white ring-1 ring-white/25",
    facebook: "bg-[#1877F2] text-white",
  };
  const logo = { google: <LogoGoogle />, apple: <LogoApple />, facebook: <LogoFacebook /> };
  return (
    <a
      href={`/api/fantasy/auth/social/start?provider=${proveedor}`}
      className={`flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl px-4 font-bold ${estilo[proveedor]}`}
    >
      {logo[proveedor]}
      Entrar con {NOMBRES_PROVEEDOR[proveedor]}
    </a>
  );
}

const NOMBRES_PROVEEDOR: Record<Proveedor, string> = {
  google: "Google",
  apple: "Apple",
  facebook: "Facebook",
};

/** Los logotipos van en SVG porque una imagen externa no cargaría: la política
 *  de contenido de esta app no permite pedir nada a otro servidor. */
function LogoApple() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.26 3.03-.9.9-1.98 1.42-3.06 1.34-.12-1.1.42-2.24 1.26-3.06.9-.9 2.1-1.4 3.06-1.31zM20.5 17.1c-.54 1.24-.8 1.8-1.5 2.9-.98 1.53-2.36 3.44-4.06 3.45-1.52.02-1.91-.99-3.97-.98-2.06.01-2.49 1-4.01.98-1.7-.02-3-1.74-3.99-3.27C.2 16.9-.06 11.9 1.8 9.35c1.02-1.42 2.63-2.32 4.14-2.32 1.55 0 2.52 1 3.8 1 1.24 0 2-1 3.79-1 1.35 0 2.78.73 3.8 2-3.34 1.83-2.8 6.6.17 8.07z" />
    </svg>
  );
}

function LogoFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.6-.15-3.15-.43-4.65H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.6 5.9c4.44-4.1 7.22-10.16 7.22-17.45z" />
      <path fill="#FBBC05" d="M10.4 28.7a14.4 14.4 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.95-2.15 15.93-5.85l-7.6-5.9c-2.12 1.42-4.84 2.25-8.33 2.25-6.3 0-11.7-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
