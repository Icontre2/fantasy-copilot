"use client";

import {
  Check,
  ChevronRight,
  Link2,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Unplug,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { LaligaLeague } from "./laliga-contract";
import { supabase } from "./supabase";

type TeamRef = { id: string } | null;

type SessionResponse = {
  connected: boolean;
  expiresAt?: string;
};

type LeaguesResponse = {
  leagues: LaligaLeague[];
};

type SyncResponse = {
  balance: number;
  marketCount: number;
  squadCount: number;
  squadValue: number;
  synced: boolean;
  teamId: string;
};

type LaligaConnectionCardProps = {
  demoMode?: boolean;
  onSynced: () => void;
  team: TeamRef;
};

async function laligaRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) {
    throw new Error("Inicia sesión en Fantasy Copilot para continuar.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", "Bearer " + accessToken);
  if (init.body) headers.set("Content-Type", "application/json");

  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: unknown;
  };

  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "No se ha podido completar la conexión.",
    );
  }

  return payload as T;
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    currency: "EUR",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value);

export function LaligaConnectionCard({
  demoMode = false,
  onSynced,
  team,
}: LaligaConnectionCardProps) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<LaligaLeague[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SyncResponse | null>(null);

  const loadLeagues = useCallback(async () => {
    const response = await laligaRequest<LeaguesResponse>(
      "/api/laliga/leagues",
    );
    setLeagues(response.leagues);
    setSelectedLeagueId((current) =>
      response.leagues.some((league) => league.id === current)
        ? current
        : (response.leagues[0]?.id ?? ""),
    );
  }, []);

  useEffect(() => {
    if (!open || demoMode) return;

    let active = true;

    const checkSession = async () => {
      setChecking(true);
      setError("");

      try {
        const session = await laligaRequest<SessionResponse>(
          "/api/laliga/session",
        );
        if (!active) return;

        setConnected(session.connected);
        setExpiresAt(session.expiresAt ?? null);
        if (session.connected) await loadLeagues();
      } catch (requestError) {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo comprobar la conexión.",
        );
      } finally {
        if (active) setChecking(false);
      }
    };

    void checkSession();
    return () => {
      active = false;
    };
  }, [demoMode, loadLeagues, open]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (!consent) return;

    setBusy(true);
    setError("");
    setResult(null);

    const credentials = { email: email.trim(), password };
    setPassword("");

    try {
      const session = await laligaRequest<SessionResponse>(
        "/api/laliga/login",
        {
          method: "POST",
          body: JSON.stringify(credentials),
        },
      );
      setConnected(true);
      setExpiresAt(session.expiresAt ?? null);
      setEmail("");
      await loadLeagues();
    } catch (requestError) {
      setConnected(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo iniciar sesión.",
      );
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    const league = leagues.find(
      (candidate) => candidate.id === selectedLeagueId,
    );
    if (!league) return;

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const response = await laligaRequest<SyncResponse>("/api/laliga/sync", {
        method: "POST",
        body: JSON.stringify({
          fantasyTeamId: team?.id ?? null,
          leagueId: league.id,
          teamId: league.teamId,
        }),
      });
      setResult(response);
      onSynced();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo sincronizar.",
      );
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError("");

    try {
      await laligaRequest<SessionResponse>("/api/laliga/disconnect", {
        method: "POST",
      });
      setConnected(false);
      setExpiresAt(null);
      setLeagues([]);
      setSelectedLeagueId("");
      setResult(null);
      setConsent(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cerrar la conexión.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className={`connection-card ${connected ? "connected" : ""}`}>
        <span className="connection-icon">
          {connected ? <Link2 size={22} /> : <LockKeyhole size={22} />}
        </span>
        <div>
          <span className="modal-kicker">LALIGA Fantasy</span>
          <strong>
            {demoMode
              ? "Conexión no disponible en demo"
              : connected
                ? "Cuenta conectada"
                : "Conectar cuenta privada"}
          </strong>
          <p>
            {connected
              ? "Sesión temporal activa. Sincroniza cuando quieras."
              : "Importa liga, saldo, plantilla y mercado con un toque."}
          </p>
        </div>
        <button
          className="secondary-button compact-button"
          disabled={demoMode}
          onClick={() => setOpen(true)}
          type="button"
        >
          {connected ? "Gestionar" : "Conectar"}
        </button>
      </section>

      {open && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !busy) setOpen(false);
          }}
          role="presentation"
        >
          <section
            aria-labelledby="laliga-connection-title"
            aria-modal="true"
            className="modal-sheet"
            role="dialog"
          >
            <button
              aria-label="Cerrar"
              className="modal-close"
              disabled={busy}
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={19} />
            </button>

            <div className="connection-modal">
              <span className="connection-hero-icon">
                <ShieldCheck size={28} />
              </span>
              <span className="modal-kicker">Piloto privado · solo lectura</span>
              <h2 id="laliga-connection-title">
                {connected ? "Sincroniza tu liga" : "Conecta tu cuenta"}
              </h2>
              <p>
                La contraseña viaja una sola vez hasta el acceso de LALIGA y se
                descarta. La sesión queda cifrada, ligada a tu usuario y nunca
                entra en la base de datos.
              </p>

              {checking ? (
                <div className="connection-loading">
                  <LoaderCircle className="spin" size={22} />
                  Comprobando sesión…
                </div>
              ) : connected ? (
                <>
                  <div className="form-alert success connection-status">
                    <Check size={17} />
                    <span>
                      Conexión temporal activa
                      {expiresAt
                        ? ` hasta ${new Intl.DateTimeFormat("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(expiresAt))}`
                        : ""}
                    </span>
                  </div>

                  {leagues.length > 0 ? (
                    <div className="connection-leagues">
                      <span className="field-label">Elige una liga</span>
                      {leagues.map((league) => (
                        <button
                          className={
                            selectedLeagueId === league.id
                              ? "league-choice selected"
                              : "league-choice"
                          }
                          key={league.id}
                          onClick={() => setSelectedLeagueId(league.id)}
                          type="button"
                        >
                          <span>
                            <strong>{league.name}</strong>
                            <small>
                              {league.squadCount} jugadores
                              {league.balance !== null
                                ? ` · ${formatMoney(league.balance)}`
                                : ""}
                            </small>
                          </span>
                          {selectedLeagueId === league.id ? (
                            <Check size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="form-alert error">
                      No se encontraron ligas compatibles en esta cuenta.
                    </div>
                  )}

                  {result && (
                    <div className="sync-result">
                      <Check size={20} />
                      <div>
                        <strong>Sincronización completada</strong>
                        <span>
                          {result.squadCount} jugadores · {result.marketCount} en
                          mercado · saldo {formatMoney(result.balance)}
                        </span>
                      </div>
                    </div>
                  )}

                  {error && <div className="form-alert error">{error}</div>}

                  <button
                    className="primary-button full"
                    disabled={busy || !selectedLeagueId}
                    onClick={() => void sync()}
                    type="button"
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      <RefreshCw size={18} />
                    )}
                    {result ? "Sincronizar de nuevo" : "Sincronizar ahora"}
                  </button>
                  <button
                    className="secondary-button full disconnect-button"
                    disabled={busy}
                    onClick={() => void disconnect()}
                    type="button"
                  >
                    <Unplug size={17} /> Desconectar y borrar sesión
                  </button>
                </>
              ) : (
                <form className="modal-form connection-form" onSubmit={login}>
                  <label>
                    Email de LALIGA Fantasy
                    <input
                      autoComplete="username"
                      inputMode="email"
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tu@email.com"
                      required
                      type="email"
                      value={email}
                    />
                  </label>
                  <label>
                    Contraseña de LALIGA Fantasy
                    <input
                      autoComplete="current-password"
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Tu contraseña"
                      required
                      type="password"
                      value={password}
                    />
                  </label>

                  <label className="connection-consent">
                    <input
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      required
                      type="checkbox"
                    />
                    <span>
                      Entiendo que es un piloto privado: mis credenciales se
                      reenvían a LALIGA una sola vez, la contraseña no se guarda
                      y no se ejecutarán pujas, compras ni ventas.
                    </span>
                  </label>

                  <ul className="check-list compact-list">
                    <li>
                      <Check size={16} /> Solo lectura y sincronización manual
                    </li>
                    <li>
                      <Check size={16} /> Sesión cifrada y cierre inmediato
                    </li>
                    <li>
                      <Check size={16} /> CSV disponible como respaldo
                    </li>
                  </ul>

                  <div className="social-login-note">
                    Las cuentas creadas exclusivamente con Google, Apple o
                    Facebook todavía no son compatibles.
                  </div>

                  {error && <div className="form-alert error">{error}</div>}

                  <button
                    className="primary-button full"
                    disabled={busy || !consent || !email.trim() || !password}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      <LockKeyhole size={18} />
                    )}
                    Conectar de forma privada
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
