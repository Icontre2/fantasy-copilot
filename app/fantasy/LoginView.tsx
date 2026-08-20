"use client";

import { useState } from "react";
import { Clock, ExternalLink, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { post } from "./api";
import type { DiagnosticoDeSesion, Manager, Proveedor } from "./types";
import { ErrorBox } from "./ui";

export function LoginView({
  onLogin,
  sesion,
  social,
  errorDeAcceso,
  avisoDeAcceso,
}: {
  onLogin: (manager: Manager) => void;
  sesion?: DiagnosticoDeSesion | null;
  social?: { proveedores: Proveedor[]; identificado: boolean; motivo?: string | null } | null;
  errorDeAcceso?: string | null;
  avisoDeAcceso?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSocialToken, setShowSocialToken] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const aVista = error ?? errorDeAcceso ?? null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { manager } = await post<{ manager: Manager }>("/api/fantasy/auth/login", { email, password });
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
      const { manager } = await post<{ manager: Manager }>("/api/fantasy/auth/token", { token: tokenInput });
      setTokenInput("");
      onLogin(manager);
    } catch (caught) {
      setTokenError(caught instanceof Error ? caught.message : "No se pudo validar esa sesión de LALIGA.");
    } finally {
      setTokenBusy(false);
    }
  }

  return (
    <section className="mx-auto mt-[3vh] w-full max-w-md overflow-hidden rounded-[34px] border border-white/10 bg-[#f7f4fb] shadow-[0_28px_90px_rgba(0,0,0,.45)]">
      <div className="relative overflow-hidden bg-[linear-gradient(145deg,#4c1d95_0%,#7c3aed_55%,#8b5cf6_100%)] px-6 pb-14 pt-7 text-white">
        <div className="absolute -bottom-8 left-[-8%] h-20 w-[116%] rounded-[50%] bg-[#f7f4fb]" />
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-base font-black text-white ring-1 ring-white/20 backdrop-blur">LL</span>
        <p className="mt-7 text-xs font-semibold uppercase tracking-[.18em] text-white/60">LigaLab</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-.045em]">Tu liga, más clara.</h1>
        <p className="mt-2 max-w-xs text-sm leading-5 text-white/70">Entra, conecta tu Fantasy y controla valor, caja, rivales y mercado desde un solo sitio.</p>
      </div>

      <div className="px-6 pb-7 pt-2 text-[#17121f]">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-black tracking-tight">Iniciar sesión</h2>
          <p className="mt-1 text-xs text-[#777180]">Accede a tu cuenta para continuar</p>
        </div>

        {avisoDeAcceso && (
          <p className="mb-4 flex gap-2 rounded-2xl bg-emerald-50 p-3 text-[12px] leading-4 text-emerald-700" role="status">
            <ShieldCheck size={16} className="mt-px shrink-0" /><span>{avisoDeAcceso}</span>
          </p>
        )}

        {social && social.proveedores.length > 0 && !social.identificado && (
          <>
            <div className="space-y-2.5">
              {social.proveedores.map((proveedor) => <BotonProveedor key={proveedor} proveedor={proveedor} />)}
            </div>
            <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.12em] text-[#9b96a5]">
              <span className="h-px flex-1 bg-black/10" /> o con tu cuenta de LALIGA <span className="h-px flex-1 bg-black/10" />
            </div>
          </>
        )}

        {social && social.proveedores.length === 0 && social.motivo && (
          <p className="mb-4 rounded-2xl bg-black/[.04] p-3 text-[11px] leading-4 text-[#777180]">
            <strong className="text-[#4b4653]">Acceso social sin configurar.</strong> {social.motivo}
          </p>
        )}

        {social?.identificado && (
          <p className="mb-4 rounded-2xl bg-[#7c3aed]/10 p-3 text-[12px] leading-4 text-[#5b21b6]">
            <strong>Ya te has identificado en LigaLab.</strong> Ahora conecta tu cuenta de LALIGA Fantasy.
          </p>
        )}

        <form onSubmit={submit} className="space-y-3.5">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.08em] text-[#6f6978]">Email</span>
            <span className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 shadow-sm">
              <Mail size={17} className="text-[#8b8494]" />
              <input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent py-3.5 text-[#17121f] outline-none" />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.08em] text-[#6f6978]">Contraseña</span>
            <span className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 shadow-sm">
              <LockKeyhole size={17} className="text-[#8b8494]" />
              <input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent py-3.5 text-[#17121f] outline-none" />
            </span>
          </label>

          {aVista && <ErrorBox message={aVista} />}

          <button type="submit" disabled={busy} className="w-full rounded-2xl bg-[linear-gradient(90deg,#6d28d9,#8b5cf6)] px-4 py-4 font-black text-white shadow-[0_10px_28px_rgba(124,58,237,.28)] disabled:opacity-50">
            {busy ? "Entrando…" : social?.identificado ? "Conectar mi cuenta de LALIGA" : "Entrar"}
          </button>

          <button type="button" onClick={() => { setShowSocialToken((current) => !current); setTokenError(null); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#7c3aed]/25 bg-white px-4 py-3.5 text-sm font-bold text-[#6d28d9] shadow-sm" aria-expanded={showSocialToken}>
            <KeyRound size={17} /> Entrar con mi cuenta de LALIGA
          </button>

          {showSocialToken && (
            <div className="space-y-3 rounded-2xl border border-[#7c3aed]/20 bg-[#f0eafe] p-4">
              <div>
                <p className="text-sm font-bold text-[#4c1d95]">Conectar una cuenta social de LALIGA</p>
                <p className="mt-1 text-[11px] leading-4 text-[#6f6978]">Inicia sesión en la web oficial y pega aquí la respuesta de token que LALIGA entrega.</p>
              </div>
              <a href="https://miliga.laliga.com/" target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17121f] px-3 py-2.5 text-xs font-bold text-white">Abrir acceso oficial de LALIGA <ExternalLink size={14} /></a>
              <textarea value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} spellCheck={false} autoCapitalize="off" autoCorrect="off" placeholder={'{"access_token":"…","refresh_token":"…"}'} className="min-h-28 w-full resize-y rounded-xl border border-black/10 bg-white p-3 font-mono text-[11px] leading-4 text-[#17121f] outline-none focus:border-[#8b5cf6]" />
              {tokenError && <ErrorBox message={tokenError} />}
              <button type="button" onClick={submitImportedToken} disabled={tokenBusy || !tokenInput.trim()} className="w-full rounded-xl bg-[#7c3aed] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{tokenBusy ? "Validando con LALIGA…" : "Conectar esta sesión"}</button>
            </div>
          )}

          <p className="flex gap-2 rounded-2xl bg-emerald-50 p-3 text-[11px] leading-4 text-emerald-700"><ShieldCheck size={16} className="mt-px shrink-0" /><span>La contraseña se usa una vez y no se guarda.</span></p>

          {sesion?.degradado && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-4 text-amber-800">
              <p className="flex items-center gap-2 font-bold"><Clock size={14} className="shrink-0" />{sesion.titulo} · durará {sesion.duracion}</p>
              <p className="mt-1.5">{sesion.explicacion}</p>
            </div>
          )}

          <p className="pt-1 text-center text-[10px] leading-4 text-[#8b8494]"><a href="/privacidad" className="underline underline-offset-2">Qué datos maneja LigaLab</a>{" · "}Herramienta independiente, no afiliada a LALIGA.</p>
        </form>
      </div>
    </section>
  );
}

function BotonProveedor({ proveedor }: { proveedor: Proveedor }) {
  const estilo: Record<Proveedor, string> = {
    google: "bg-white text-[#1f1f1f] border border-black/10 shadow-sm",
    apple: "bg-black text-white shadow-sm",
    facebook: "bg-[#1877F2] text-white shadow-sm",
  };
  const logo = { google: <LogoGoogle />, apple: <LogoApple />, facebook: <LogoFacebook /> };
  return (
    <a href={`/api/fantasy/auth/social/start?provider=${proveedor}`} className={`flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl px-4 font-bold ${estilo[proveedor]}`}>
      {logo[proveedor]} Continuar con {NOMBRES_PROVEEDOR[proveedor]}
    </a>
  );
}

const NOMBRES_PROVEEDOR: Record<Proveedor, string> = { google: "Google", apple: "Apple", facebook: "Facebook" };

function LogoApple() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false"><path d="M16.365 1.43c0 1.14-.42 2.2-1.26 3.03-.9.9-1.98 1.42-3.06 1.34-.12-1.1.42-2.24 1.26-3.06.9-.9 2.1-1.4 3.06-1.31zM20.5 17.1c-.54 1.24-.8 1.8-1.5 2.9-.98 1.53-2.36 3.44-4.06 3.45-1.52.02-1.91-.99-3.97-.98-2.06.01-2.49 1-4.01.98-1.7-.02-3-1.74-3.99-3.27C.2 16.9-.06 11.9 1.8 9.35c1.02-1.42 2.63-2.32 4.14-2.32 1.55 0 2.52 1 3.8 1 1.24 0 2-1 3.79-1 1.35 0 2.78.73 3.8 2-3.34 1.83-2.8 6.6.17 8.07z" /></svg>;
}

function LogoFacebook() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" /></svg>;
}

function LogoGoogle() {
  return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden focusable="false"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.6-.15-3.15-.43-4.65H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.6 5.9c4.44-4.1 7.22-10.16 7.22-17.45z" /><path fill="#FBBC05" d="M10.4 28.7a14.4 14.4 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.95-2.15 15.93-5.85l-7.6-5.9c-2.12 1.42-4.84 2.25-8.33 2.25-6.3 0-11.7-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" /></svg>;
}
