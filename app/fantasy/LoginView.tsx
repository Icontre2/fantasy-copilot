"use client";

import { useState } from "react";
import { post } from "./api";
import type { DiagnosticoDeSesion, Manager } from "./types";
import { ErrorBox } from "./ui";
import { Clock, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

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
export function LoginView({
  onLogin,
  sesion,
  google,
  errorDeGoogle,
}: {
  onLogin: (manager: Manager) => void;
  /** Cuánto va a durar la sesión. Solo se avisa si va a durar poco. */
  sesion?: DiagnosticoDeSesion | null;
  /** Si se puede entrar con Google, y si ya lo has hecho. */
  google?: { disponible: boolean; identificado: boolean } | null;
  /** Por qué falló el último acceso con Google, si falló. */
  errorDeGoogle?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * El error del acceso con Google llega ya resuelto desde el servidor. Se usa
   * mientras el usuario no haya intentado nada más: en cuanto escribe y pulsa
   * «entrar», manda lo que diga ESE intento y no el anterior.
   */
  const aVista = error ?? errorDeGoogle ?? null;

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
    <section className="mx-auto mt-[8vh] w-full max-w-md overflow-hidden rounded-[32px] glass">
      <div className="bg-[linear-gradient(145deg,#17121f,#32175d)] p-6 text-white">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7c3aed] text-lg font-black text-white">LL</span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-white/45">LigaLab</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.04em]">Tu liga, más clara.</h1>
        <p className="mt-2 text-sm leading-5 text-white/60">Consulta cajas, plantillas, alertas y mercado desde un único sitio.</p>
      </div>

      {/*
        Entrar con Google va ARRIBA del formulario y solo si aún no te has
        identificado. Una vez identificado, lo que toca es lo de abajo: conectar
        LALIGA una vez. Enseñar los dos a la vez haría pensar que hay que elegir,
        cuando en realidad son dos pasos del mismo camino.
      */}
      {google?.disponible && !google.identificado && (
        <div className="border-b border-white/8 p-6 pb-5">
          {/*
            Enlace y no botón con `fetch`: el navegador tiene que ACABAR en
            Google, con su barra de direcciones y su candado, para que puedas
            comprobar tú a quién le estás dando la contraseña.
          */}
          <a
            href="/api/fantasy/auth/google/start"
            className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 font-bold text-[#1f1f1f]"
          >
            <LogoGoogle />
            Entrar con Google
          </a>
          <p className="mt-3 text-center text-[11px] leading-4 text-neutral-500">
            La primera vez te pedirá una sola vez la contraseña de LALIGA, para saber cuál es tu
            cuenta. Después ya no.
          </p>
          <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[.14em] text-neutral-600">
            o con tu cuenta de LALIGA
          </p>
        </div>
      )}

      {google?.identificado && (
        <div className="border-b border-white/8 p-6 pb-5">
          <p className="rounded-2xl bg-[#7c3aed]/15 p-3 text-[12px] leading-4 text-[#c4b5fd]">
            <strong>Ya te has identificado con Google.</strong> Solo falta decirle cuál es tu cuenta
            de LALIGA Fantasy: escribe su email y su contraseña una vez y no volverá a pedírtela.
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
          {busy ? "Entrando…" : google?.identificado ? "Conectar mi cuenta de LALIGA" : "Entrar"}
        </button>
        {/*
          Cuidado con esta frase: arriba hay un botón de Google, así que decir
          «las cuentas de Google no tienen contraseña» a secas se lee como una
          contradicción. Habla de la cuenta de LALIGA, que es otra distinta, y
          por eso lo dice con esas palabras.
        */}
        <p className="flex gap-2 rounded-2xl bg-emerald-500/10 p-3 text-[11px] leading-4 text-emerald-300"><ShieldCheck size={16} className="shrink-0"/>La contraseña se usa una vez y no se guarda. Ojo: aquí va la de tu cuenta <strong>de LALIGA Fantasy</strong>, y si esa la creaste con Google, Apple o Facebook no tiene contraseña propia y no podrás conectarla.</p>

        {/*
          Si la sesión va a durar poco, se dice AQUÍ y antes de entrar. Es el
          momento exacto en que a alguien le interesa saber por qué le echan: el
          síntoma es volver a ver esta pantalla, y sin esto no hay forma de
          distinguirlo de un fallo de LALIGA o de una contraseña mal escrita.
        */}
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

/** El logotipo de Google. Va en SVG porque una imagen externa no cargaría: la
 *  política de contenido de esta app no permite pedir nada a otro servidor. */
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
