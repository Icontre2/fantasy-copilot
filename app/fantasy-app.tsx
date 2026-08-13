"use client";

/**
 * DESACOPLADO — no forma parte del producto actual.
 *
 * Esta es la app anterior (importacion manual/CSV, dashboard, recomendaciones).
 * Ya no la monta nadie: `app/page.tsx` renderiza `app/fantasy/FantasyApp.tsx`,
 * centrado en datos reales, alertas de clausula, exportacion y contabilidad.
 *
 * Se conserva a proposito en vez de borrarla — junto con `laliga-provider.ts` y
 * `csv-import.ts`, de los que depende — para no perder la via de importacion
 * manual mientras el conector nuevo se valida contra una liga real. Si se
 * decide que no vuelve, se elimina el trio entero de una vez.
 */

import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coins,
  Crown,
  Eye,
  ExternalLink,
  FileText,
  Goal,
  Home,
  Info,
  ListFilter,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import type { Session, User } from "@supabase/supabase-js";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Database } from "./database.types";
import {
  normalizePlayerName,
  parseSquadCsv,
  type CsvSquadRow,
} from "./csv-import";
import { getLaligaConnectorState } from "./laliga-provider";
import { supabase } from "./supabase";

type Tab = "home" | "squad" | "market" | "profile";
type AuthMode = "login" | "register" | "reset";
type Team = Database["public"]["Tables"]["fantasy_teams"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Progress =
  Database["public"]["Tables"]["onboarding_progress"]["Row"];
type Player = Database["public"]["Tables"]["players"]["Row"];
type Club = Database["public"]["Tables"]["clubs"]["Row"];
type SquadPlayer =
  Database["public"]["Tables"]["squad_players"]["Row"];
type MarketEntry =
  Database["public"]["Tables"]["market_entries"]["Row"];
type Recommendation =
  Database["public"]["Tables"]["recommendations"]["Row"];

type LiveData = {
  profile: Profile | null;
  progress: Progress | null;
  team: Team | null;
  players: Player[];
  clubs: Club[];
  squad: SquadPlayer[];
  market: MarketEntry[];
  recommendations: Recommendation[];
};

const emptyLiveData: LiveData = {
  profile: null,
  progress: null,
  team: null,
  players: [],
  clubs: [],
  squad: [],
  market: [],
  recommendations: [],
};

const demoPlayers = [
  {
    id: "demo-1",
    full_name: "Álex Baena",
    position: "MID",
    club: "Villarreal",
    status: "available",
    current_value: 27_400_000,
    purchase_price: 23_800_000,
    is_starter: true,
    is_captain: true,
    form: 8.7,
  },
  {
    id: "demo-2",
    full_name: "Nico Williams",
    position: "FWD",
    club: "Athletic",
    status: "available",
    current_value: 31_200_000,
    purchase_price: 28_500_000,
    is_starter: true,
    is_captain: false,
    form: 8.2,
  },
  {
    id: "demo-3",
    full_name: "Isco",
    position: "MID",
    club: "Real Betis",
    status: "doubtful",
    current_value: 24_900_000,
    purchase_price: 21_000_000,
    is_starter: true,
    is_captain: false,
    form: 7.8,
  },
  {
    id: "demo-4",
    full_name: "Pau Cubarsí",
    position: "DEF",
    club: "Barcelona",
    status: "available",
    current_value: 19_800_000,
    purchase_price: 16_900_000,
    is_starter: true,
    is_captain: false,
    form: 7.6,
  },
  {
    id: "demo-5",
    full_name: "Álex Remiro",
    position: "GK",
    club: "Real Sociedad",
    status: "available",
    current_value: 12_600_000,
    purchase_price: 11_200_000,
    is_starter: true,
    is_captain: false,
    form: 7.4,
  },
  {
    id: "demo-6",
    full_name: "Dani Vivian",
    position: "DEF",
    club: "Athletic",
    status: "available",
    current_value: 15_200_000,
    purchase_price: 13_100_000,
    is_starter: true,
    is_captain: false,
    form: 7.2,
  },
  {
    id: "demo-7",
    full_name: "Óscar Mingueza",
    position: "DEF",
    club: "Celta",
    status: "suspended",
    current_value: 13_900_000,
    purchase_price: 12_700_000,
    is_starter: false,
    is_captain: false,
    form: 6.9,
  },
  {
    id: "demo-8",
    full_name: "Mikel Oyarzabal",
    position: "FWD",
    club: "Real Sociedad",
    status: "available",
    current_value: 26_100_000,
    purchase_price: 25_200_000,
    is_starter: true,
    is_captain: false,
    form: 7.5,
  },
] as const;

const demoMarket = [
  {
    id: "market-1",
    name: "Take Kubo",
    club: "Real Sociedad",
    position: "MID",
    price: 26_800_000,
    value: 25_100_000,
    score: 91,
    trend: 5.4,
    expires: "2 h 14 min",
  },
  {
    id: "market-2",
    name: "Ayoze Pérez",
    club: "Villarreal",
    position: "FWD",
    price: 18_900_000,
    value: 19_400_000,
    score: 86,
    trend: 3.8,
    expires: "4 h 42 min",
  },
  {
    id: "market-3",
    name: "Miguel Gutiérrez",
    club: "Girona",
    position: "DEF",
    price: 15_600_000,
    value: 14_800_000,
    score: 78,
    trend: -1.2,
    expires: "7 h 08 min",
  },
] as const;

const formatMoney = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) >= 1_000_000) {
    return `${new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 1,
    }).format(value / 1_000_000)} M€`;
  }
  return `${new Intl.NumberFormat("es-ES").format(value)} €`;
};

const positionLabel: Record<string, string> = {
  GK: "Porteros",
  DEF: "Defensas",
  MID: "Centrocampistas",
  FWD: "Delanteros",
};

const statusLabel: Record<string, string> = {
  available: "Disponible",
  doubtful: "Duda",
  injured: "Lesionado",
  suspended: "Sancionado",
  unknown: "Sin datos",
};

export default function FantasyApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [data, setData] = useState<LiveData>(emptyLiveData);
  const [loadingData, setLoadingData] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async (user: User) => {
    setLoadingData(true);
    setGlobalError("");

    try {
      const [
        profileResult,
        progressResult,
        teamResult,
        playersResult,
        clubsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("onboarding_progress")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("fantasy_teams")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from("players").select("*").order("full_name"),
        supabase.from("clubs").select("*").order("name"),
      ]);

      const firstError =
        profileResult.error ??
        progressResult.error ??
        teamResult.error ??
        playersResult.error ??
        clubsResult.error;
      if (firstError) throw firstError;

      const team = teamResult.data;
      let squad: SquadPlayer[] = [];
      let market: MarketEntry[] = [];
      let recommendations: Recommendation[] = [];

      if (team) {
        const [squadResult, marketResult, recommendationResult] =
          await Promise.all([
            supabase
              .from("squad_players")
              .select("*")
              .eq("fantasy_team_id", team.id)
              .order("created_at"),
            supabase
              .from("market_entries")
              .select("*")
              .eq("fantasy_team_id", team.id)
              .order("asking_price", { ascending: true }),
            supabase
              .from("recommendations")
              .select("*")
              .eq("fantasy_team_id", team.id)
              .order("created_at", { ascending: false })
              .limit(3),
          ]);
        const teamError =
          squadResult.error ??
          marketResult.error ??
          recommendationResult.error;
        if (teamError) throw teamError;
        squad = squadResult.data ?? [];
        market = marketResult.data ?? [];
        recommendations = recommendationResult.data ?? [];
      }

      setData({
        profile: profileResult.data,
        progress: progressResult.data,
        team,
        players: playersResult.data ?? [],
        clubs: clubsResult.data ?? [],
        squad,
        market,
        recommendations,
      });
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "No se han podido cargar tus datos.",
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: authData }) => {
      if (!mounted) return;
      setSession(authData.session);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setAuthReady(true);
        if (!nextSession) setData(emptyLiveData);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const user = session?.user;
    if (!user || demoMode) return;
    const timer = window.setTimeout(() => void loadData(user), 0);
    return () => window.clearTimeout(timer);
  }, [demoMode, loadData, refreshKey, session?.user]);

  const refresh = () => setRefreshKey((value) => value + 1);

  if (!authReady) {
    return <LoadingScreen />;
  }

  if (!session && !demoMode) {
    return (
      <Landing
        authMode={authMode}
        onAuthMode={setAuthMode}
        onDemo={() => {
          setDemoMode(true);
          setActiveTab("home");
        }}
      />
    );
  }

  if (session && !demoMode && loadingData && !data.profile && !data.team) {
    return <LoadingScreen label="Preparando tu equipo…" />;
  }

  const needsOnboarding =
    Boolean(session) &&
    !demoMode &&
    (!data.progress?.completed || !data.team);

  if (needsOnboarding && session) {
    return (
      <Onboarding
        user={session.user}
        data={data}
        onRefresh={refresh}
        onDemo={() => setDemoMode(true)}
      />
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      demoMode={demoMode}
      onExitDemo={() => {
        setDemoMode(false);
        setActiveTab("home");
      }}
      user={session?.user ?? null}
      data={data}
      loading={loadingData}
      error={globalError}
      onRefresh={refresh}
    />
  );
}

function LoadingScreen({ label = "Cargando Fantasy Copilot…" }: { label?: string }) {
  return (
    <main className="loading-screen">
      <BrandMark />
      <LoaderCircle className="spin" size={26} />
      <p>{label}</p>
    </main>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "compact" : ""}`}>
      <span className="brand-icon">
        <Target size={compact ? 18 : 22} strokeWidth={2.6} />
      </span>
      <span className="brand-copy">
        <strong>FANTASY</strong>
        <strong>COPILOT</strong>
      </span>
    </div>
  );
}

function Landing({
  authMode,
  onAuthMode,
  onDemo,
}: {
  authMode: AuthMode | null;
  onAuthMode: (mode: AuthMode | null) => void;
  onDemo: () => void;
}) {
  if (authMode) {
    return <AuthPanel mode={authMode} onMode={onAuthMode} onClose={() => onAuthMode(null)} />;
  }

  return (
    <main className="landing">
      <header className="landing-nav">
        <BrandMark />
        <button className="text-button" onClick={() => onAuthMode("login")}>
          Entrar <ArrowRight size={17} />
        </button>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={15} /> Decisiones, no más datos
          </span>
          <h1>
            Tu ventaja para
            <span> ganar el Fantasy.</span>
          </h1>
          <p>
            Analiza plantilla, mercado y jornada. Recibe recomendaciones claras
            para comprar, vender, alinear y elegir capitán.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onAuthMode("register")}>
              Crear mi equipo <ArrowRight size={18} />
            </button>
            <button className="secondary-button" onClick={onDemo}>
              <Eye size={18} /> Ver demo
            </button>
          </div>
          <div className="trust-row">
            <span>
              <ShieldCheck size={16} /> Sin contraseña de LALIGA
            </span>
            <span>
              <Zap size={16} /> Configuración en 3 minutos
            </span>
          </div>
        </div>

        <div className="hero-product">
          <div className="floating-score">
            <span>Copilot score</span>
            <strong>84</strong>
            <small>+7 esta jornada</small>
          </div>
          <div className="phone-card">
            <div className="phone-top">
              <BrandMark compact />
              <Bell size={19} />
            </div>
            <span className="muted-kicker">Buenas, Iñigo</span>
            <h2>Tu jornada, bajo control.</h2>
            <div className="mini-balance">
              <span>Patrimonio total</span>
              <strong>182,4 M€</strong>
              <em>+4,8%</em>
            </div>
            <div className="mini-recommendation">
              <span className="rec-icon buy">
                <TrendingUp size={17} />
              </span>
              <div>
                <small>COMPRA PRIORITARIA</small>
                <strong>Ficha a Take Kubo</strong>
                <p>Forma alta y rival favorable. Valor esperado +6%.</p>
              </div>
              <ChevronRight size={19} />
            </div>
            <div className="mini-grid">
              <div>
                <Users size={17} />
                <strong>8/11</strong>
                <span>Titulares listos</span>
              </div>
              <div>
                <Crown size={17} />
                <strong>Baena</strong>
                <span>Capitán recomendado</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-proof">
        <div>
          <strong>Una decisión clara</strong>
          <span>por encima de cien estadísticas</span>
        </div>
        <div>
          <strong>Explicaciones breves</strong>
          <span>para saber siempre el porqué</span>
        </div>
        <div>
          <strong>Control manual</strong>
          <span>tú decides; el Copilot te guía</span>
        </div>
      </section>
    </main>
  );
}

function AuthPanel({
  mode,
  onMode,
  onClose,
}: {
  mode: AuthMode;
  onMode: (mode: AuthMode) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      } else if (mode === "register") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() || null },
            emailRedirectTo:
              typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage(
            "Cuenta creada. Revisa tu correo para confirmar el acceso.",
          );
        }
      } else {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo:
              typeof window !== "undefined" ? window.location.origin : undefined,
          });
        if (resetError) throw resetError;
        setMessage("Te hemos enviado el enlace de recuperación.");
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? translateAuthError(authError.message)
          : "No se ha podido completar el acceso.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <button className="close-auth" onClick={onClose} aria-label="Volver">
        <X size={21} />
      </button>
      <div className="auth-brand-panel">
        <BrandMark />
        <div>
          <span className="eyebrow dark">
            <Goal size={15} /> Tu próxima jornada empieza aquí
          </span>
          <h1>Convierte datos en puntos.</h1>
          <p>
            Sin automatizaciones peligrosas ni credenciales de LALIGA. Solo
            mejores decisiones.
          </p>
        </div>
        <div className="auth-proof">
          <ShieldCheck size={22} />
          <div>
            <strong>Tus datos, solo tuyos</strong>
            <span>Protegidos por acceso individual en Supabase.</span>
          </div>
        </div>
      </div>

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <span className="form-kicker">
            {mode === "login"
              ? "Bienvenido de vuelta"
              : mode === "register"
                ? "Empieza gratis"
                : "Recupera tu acceso"}
          </span>
          <h2>
            {mode === "login"
              ? "Entra en tu equipo"
              : mode === "register"
                ? "Crea tu cuenta"
                : "Restablece tu contraseña"}
          </h2>
          <p>
            {mode === "reset"
              ? "Introduce tu email y recibirás un enlace seguro."
              : "Usa tu email. La conexión social llegará más adelante."}
          </p>

          {mode === "register" && (
            <label>
              Nombre
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Cómo quieres que te llamemos"
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </label>
          {mode !== "reset" && (
            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={6}
                required
              />
            </label>
          )}

          {error && <div className="form-alert error">{error}</div>}
          {message && <div className="form-alert success">{message}</div>}

          <button className="primary-button full" disabled={loading}>
            {loading ? (
              <LoaderCircle className="spin" size={18} />
            ) : mode === "login" ? (
              "Entrar"
            ) : mode === "register" ? (
              "Crear cuenta"
            ) : (
              "Enviar enlace"
            )}
          </button>

          {mode === "login" && (
            <button
              type="button"
              className="inline-link"
              onClick={() => onMode("reset")}
            >
              ¿Has olvidado tu contraseña?
            </button>
          )}
          <div className="auth-switch">
            {mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}
            <button
              type="button"
              onClick={() => onMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Crear cuenta" : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function translateAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login")) return "Email o contraseña incorrectos.";
  if (lower.includes("already registered")) return "Ese email ya está registrado.";
  if (lower.includes("password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (lower.includes("rate limit")) return "Demasiados intentos. Espera un momento.";
  return message;
}

function Onboarding({
  user,
  data,
  onRefresh,
  onDemo,
}: {
  user: User;
  data: LiveData;
  onRefresh: () => void;
  onDemo: () => void;
}) {
  const step = data.team ? Math.max(data.progress?.current_step ?? 3, 3) : data.progress?.current_step ?? 1;
  const [teamName, setTeamName] = useState("");
  const [balance, setBalance] = useState("");
  const [squadValue, setSquadValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);

  const updateStep = async (nextStep: number, completed = false) => {
    setSaving(true);
    setError("");
    const { error: progressError } = await supabase
      .from("onboarding_progress")
      .upsert({
        user_id: user.id,
        current_step: nextStep,
        completed,
        selected_import_method: "manual",
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (progressError) {
      setError(progressError.message);
      return;
    }
    onRefresh();
  };

  const createTeam = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { error: teamError } = await supabase.from("fantasy_teams").insert({
      user_id: user.id,
      name: teamName.trim() || "Mi equipo",
      balance: parseEuropeanNumber(balance),
      squad_value: squadValue ? parseEuropeanNumber(squadValue) : null,
      source: "manual",
    });
    if (teamError) {
      setError(teamError.message);
      setSaving(false);
      return;
    }
    await updateStep(3);
  };

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <BrandMark />
        <button className="text-button subtle" onClick={onDemo}>
          Ver demo
        </button>
      </header>
      <div className="onboarding-progress" aria-label={`Paso ${step} de 4`}>
        {[1, 2, 3, 4].map((item) => (
          <span key={item} className={item <= step ? "active" : ""} />
        ))}
      </div>

      <section className="onboarding-card">
        {step <= 1 && (
          <>
            <div className="onboarding-illustration">
              <ShieldCheck size={36} />
            </div>
            <span className="eyebrow">Paso 1 de 4</span>
            <h1>Tu cuenta Fantasy sigue siendo privada.</h1>
            <p>
              Fantasy Copilot nunca te pedirá la contraseña ni la sesión de
              LALIGA. Tú introduces los datos que quieras analizar.
            </p>
            <ul className="check-list">
              <li>
                <Check size={17} /> Sin credenciales de terceros
              </li>
              <li>
                <Check size={17} /> Datos aislados por usuario
              </li>
              <li>
                <Check size={17} /> Tú mantienes el control
              </li>
            </ul>
            <button
              className="primary-button full"
              onClick={() => void updateStep(2)}
              disabled={saving}
            >
              Continuar <ArrowRight size={18} />
            </button>
          </>
        )}

        {step === 2 && (
          <form onSubmit={createTeam} className="onboarding-form">
            <span className="eyebrow">Paso 2 de 4</span>
            <h1>Cuéntanos cómo va tu equipo.</h1>
            <p>Con estos tres datos podemos preparar tu panel inicial.</p>
            <label>
              Nombre del equipo
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Ej. Athletic de Iñigo"
                required
              />
            </label>
            <label>
              Saldo disponible
              <div className="input-with-suffix">
                <input
                  inputMode="decimal"
                  value={balance}
                  onChange={(event) => setBalance(event.target.value)}
                  placeholder="12.500.000"
                  required
                />
                <span>€</span>
              </div>
            </label>
            <label>
              Valor total de la plantilla <small>opcional</small>
              <div className="input-with-suffix">
                <input
                  inputMode="decimal"
                  value={squadValue}
                  onChange={(event) => setSquadValue(event.target.value)}
                  placeholder="180.000.000"
                />
                <span>€</span>
              </div>
            </label>
            {error && <div className="form-alert error">{error}</div>}
            <button className="primary-button full" disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={18} /> : "Crear equipo"}
            </button>
          </form>
        )}

        {step === 3 && data.team && (
          <>
            <span className="eyebrow">Paso 3 de 4</span>
            <h1>Añade tu plantilla.</h1>
            <p>
              Busca jugadores en el catálogo y añade su precio de compra o
              valor actual si lo conoces.
            </p>
            <div className="import-choice active">
              <span>
                <Search size={21} />
              </span>
              <div>
                <strong>Carga manual</strong>
                <small>Seleccionada para el primer MVP</small>
              </div>
              <Check size={19} />
            </div>
            <button
              type="button"
              className="import-choice"
              onClick={() => setShowCsv(true)}
            >
              <span>
                <Upload size={21} />
              </span>
              <div>
                <strong>Importar CSV</strong>
                <small>Nombre, posición, club y valor · Ya disponible</small>
              </div>
              <ChevronRight size={18} />
            </button>

            {data.squad.length > 0 ? (
              <div className="onboarding-squad">
                <strong>{data.squad.length} jugadores añadidos</strong>
                <span>
                  {(["GK", "DEF", "MID", "FWD"] as const)
                    .map(
                      (position) =>
                        `${position} ${
                          data.squad.filter(
                            (item) =>
                              data.players.find(
                                (player) => player.id === item.player_id,
                              )?.position === position,
                          ).length
                        }`,
                    )
                    .join(" · ")}
                </span>
              </div>
            ) : (
              <CatalogEmpty compact />
            )}

            <button
              className="secondary-button full"
              onClick={() => setShowAdd(true)}
            >
              <Plus size={18} /> Añadir jugador
            </button>
            <button
              className="primary-button full"
              onClick={() => void updateStep(4)}
              disabled={saving}
            >
              Revisar equipo <ArrowRight size={18} />
            </button>
            <button
              className="inline-link centered"
              onClick={() => void updateStep(4)}
            >
              Continuar sin jugadores por ahora
            </button>
            {showAdd && (
              <AddSquadModal
                team={data.team}
                players={data.players}
                clubs={data.clubs}
                onClose={() => setShowAdd(false)}
                onSaved={() => {
                  setShowAdd(false);
                  onRefresh();
                }}
              />
            )}
            {showCsv && (
              <CsvImportModal
                user={user}
                team={data.team}
                players={data.players}
                existingSquad={data.squad}
                onClose={() => setShowCsv(false)}
                onSaved={() => {
                  setShowCsv(false);
                  onRefresh();
                }}
              />
            )}
          </>
        )}

        {step >= 4 && data.team && (
          <>
            <div className="onboarding-illustration success">
              <Check size={36} />
            </div>
            <span className="eyebrow">Paso 4 de 4</span>
            <h1>Tu Copilot está listo.</h1>
            <p>
              Ya puedes controlar plantilla y mercado. Las recomendaciones
              llegarán cuando carguemos el catálogo de jugadores.
            </p>
            <div className="summary-card">
              <div>
                <span>Equipo</span>
                <strong>{data.team.name}</strong>
              </div>
              <div>
                <span>Saldo</span>
                <strong>{formatMoney(data.team.balance)}</strong>
              </div>
              <div>
                <span>Jugadores</span>
                <strong>{data.squad.length}</strong>
              </div>
            </div>
            {error && <div className="form-alert error">{error}</div>}
            <button
              className="primary-button full"
              onClick={() => void updateStep(4, true)}
              disabled={saving}
            >
              Entrar al dashboard <ArrowRight size={18} />
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function parseEuropeanNumber(value: string) {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function AppShell({
  activeTab,
  onTabChange,
  demoMode,
  onExitDemo,
  user,
  data,
  loading,
  error,
  onRefresh,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  demoMode: boolean;
  onExitDemo: () => void;
  user: User | null;
  data: LiveData;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  const tabs = [
    { id: "home" as const, label: "Inicio", icon: Home },
    { id: "squad" as const, label: "Plantilla", icon: Users },
    { id: "market" as const, label: "Mercado", icon: ShoppingBag },
    { id: "profile" as const, label: "Perfil", icon: UserRound },
  ];

  return (
    <main className="app-background">
      <aside className="desktop-sidebar">
        <BrandMark />
        <nav>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => onTabChange(id)}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <CircleHelp size={20} />
          <strong>¿Necesitas ayuda?</strong>
          <span>Consulta cómo cargar tus datos.</span>
        </div>
      </aside>

      <section className="app-shell">
        <header className="mobile-header">
          <BrandMark compact />
          <div>
            {loading && <LoaderCircle className="spin" size={18} />}
            <button aria-label="Notificaciones">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {demoMode && (
          <div className="demo-banner">
            <span>
              <Sparkles size={16} />
              Estás viendo una demo con datos de ejemplo.
            </span>
            <button onClick={onExitDemo}>
              {user ? "Volver a mi equipo" : "Crear mi cuenta"} <ArrowRight size={15} />
            </button>
          </div>
        )}
        {error && (
          <div className="global-error">
            <Info size={17} />
            <span>{error}</span>
            <button onClick={onRefresh}>
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        )}

        <div className="view-container">
          {activeTab === "home" && (
            <Dashboard demoMode={demoMode} data={data} onTabChange={onTabChange} />
          )}
          {activeTab === "squad" && (
            <SquadView
              demoMode={demoMode}
              user={user}
              data={data}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === "market" && (
            <MarketView demoMode={demoMode} data={data} onRefresh={onRefresh} />
          )}
          {activeTab === "profile" && (
            <ProfileView
              demoMode={demoMode}
              user={user}
              data={data}
              onExitDemo={onExitDemo}
              onRefresh={onRefresh}
            />
          )}
        </div>

        <nav className="bottom-nav">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => onTabChange(id)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}

function Dashboard({
  demoMode,
  data,
  onTabChange,
}: {
  demoMode: boolean;
  data: LiveData;
  onTabChange: (tab: Tab) => void;
}) {
  const name = demoMode
    ? "Iñigo"
    : data.profile?.display_name?.split(" ")[0] || "míster";
  const teamName = demoMode ? "Bilbao Ballers" : data.team?.name ?? "Mi equipo";
  const balance = demoMode ? 14_800_000 : data.team?.balance ?? 0;
  const squadValue = demoMode
    ? 182_400_000
    : data.team?.squad_value ??
      data.squad.reduce((sum, player) => sum + (player.current_value ?? 0), 0);
  const totalValue = balance + squadValue;
  const realAvailable = data.squad.filter((item) => {
    const player = data.players.find((candidate) => candidate.id === item.player_id);
    return player?.status === "available";
  }).length;
  const available = demoMode
    ? demoPlayers.filter((player) => player.status === "available").length
    : realAvailable;
  const totalPlayers = demoMode ? demoPlayers.length : data.squad.length;

  return (
    <div className="dashboard-view">
      <section className="view-heading">
        <div>
          <span className="muted-kicker">Buenas, {name}</span>
          <h1>Tu jornada, bajo control.</h1>
        </div>
        <button className="icon-button" aria-label="Abrir menú">
          <Menu size={21} />
        </button>
      </section>

      <section className="team-overview">
        <div className="team-overview-top">
          <div>
            <span>{teamName}</span>
            <small>Patrimonio total</small>
            <strong>{formatMoney(totalValue)}</strong>
          </div>
          <span className="team-score">
            <small>Copilot score</small>
            <strong>{demoMode ? "84" : "—"}</strong>
          </span>
        </div>
        <div className="team-stats">
          <div>
            <WalletCards size={17} />
            <span>Saldo</span>
            <strong>{formatMoney(balance)}</strong>
          </div>
          <div>
            <BarChart3 size={17} />
            <span>Plantilla</span>
            <strong>{formatMoney(squadValue)}</strong>
          </div>
          <div>
            <Activity size={17} />
            <span>Variación</span>
            <strong className="positive">{demoMode ? "+4,8%" : "—"}</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <div>
            <span className="live-dot" />
            <h2>Decisiones prioritarias</h2>
          </div>
          <button>Ver todas</button>
        </div>

        {demoMode ? (
          <div className="recommendation-list">
            <RecommendationCard
              kind="buy"
              label="Compra prioritaria"
              title="Ficha a Take Kubo"
              detail="Forma alta, rival favorable y potencial de subida del 6%."
              score={91}
            />
            <RecommendationCard
              kind="captain"
              label="Tu capitán"
              title="Confía en Álex Baena"
              detail="Es tu jugador con mejor combinación de forma y minutos."
              score={88}
            />
            <RecommendationCard
              kind="sell"
              label="Venta a vigilar"
              title="Escucha ofertas por Mingueza"
              detail="Sancionado y con precio un 9% por encima de su tendencia."
              score={76}
            />
          </div>
        ) : data.recommendations.length > 0 ? (
          <div className="recommendation-list">
            {data.recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                kind={recommendation.recommendation_type}
                label={recommendation.recommendation_type}
                title={recommendation.title}
                detail={recommendation.explanation}
                score={recommendation.score ?? 0}
              />
            ))}
          </div>
        ) : (
          <EmptyCard
            icon={<Sparkles size={22} />}
            title="Aún no hay recomendaciones"
            detail={
              data.players.length === 0
                ? "El motor empezará a analizar cuando carguemos el catálogo real de jugadores."
                : "Completa tu plantilla para activar las primeras señales."
            }
            action="Ir a mi plantilla"
            onAction={() => onTabChange("squad")}
          />
        )}
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>Estado de tu plantilla</h2>
          <button onClick={() => onTabChange("squad")}>Gestionar</button>
        </div>
        <div className="availability-card">
          <div className="availability-chart">
            <strong>{totalPlayers || "—"}</strong>
            <span>jugadores</span>
          </div>
          <div className="availability-legend">
            <div>
              <span className="status-dot available" />
              <p>Disponibles</p>
              <strong>{available}</strong>
            </div>
            <div>
              <span className="status-dot doubtful" />
              <p>Dudas</p>
              <strong>{demoMode ? 1 : 0}</strong>
            </div>
            <div>
              <span className="status-dot suspended" />
              <p>Bajas</p>
              <strong>{demoMode ? 1 : 0}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="fixture-card">
        <div>
          <span className="eyebrow">Próxima jornada</span>
          <h3>Jornada 1</h3>
          <p>
            {demoMode
              ? "La alineación cierra el viernes a las 20:30"
              : "El calendario aparecerá cuando se active la fuente de datos."}
          </p>
        </div>
        <Clock3 size={24} />
      </section>
    </div>
  );
}

function RecommendationCard({
  kind,
  label,
  title,
  detail,
  score,
}: {
  kind: string;
  label: string;
  title: string;
  detail: string;
  score: number;
}) {
  const Icon =
    kind === "buy"
      ? TrendingUp
      : kind === "sell"
        ? TrendingDown
        : kind === "captain"
          ? Crown
          : Sparkles;
  return (
    <article className={`recommendation-card ${kind}`}>
      <span className="rec-icon">
        <Icon size={20} />
      </span>
      <div className="recommendation-copy">
        <small>{label}</small>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <div className="recommendation-score">
        <strong>{Math.round(score)}</strong>
        <span>score</span>
      </div>
    </article>
  );
}

function EmptyCard({
  icon,
  title,
  detail,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-card">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{detail}</p>
      {action && onAction && <button onClick={onAction}>{action}</button>}
    </div>
  );
}

function SquadView({
  demoMode,
  user,
  data,
  onRefresh,
}: {
  demoMode: boolean;
  user: User | null;
  data: LiveData;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const clubsById = useMemo(
    () => Object.fromEntries(data.clubs.map((club) => [club.id, club])),
    [data.clubs],
  );
  const playersById = useMemo(
    () => Object.fromEntries(data.players.map((player) => [player.id, player])),
    [data.players],
  );

  const liveRows = data.squad.map((entry) => {
    const player = entry.player_id ? playersById[entry.player_id] : null;
    const club = player?.club_id ? clubsById[player.club_id] : null;

    return {
      entry,
      name: player?.full_name ?? entry.imported_name ?? "Jugador sin nombre",
      position: player?.position ?? entry.imported_position ?? "MID",
      status: player?.status ?? "unknown",
      clubName:
        club?.short_name ??
        club?.name ??
        entry.imported_club ??
        "Sin club",
    };
  });

  const toggleSquadFlag = async (
    entry: SquadPlayer,
    field: "is_starter" | "is_captain",
  ) => {
    setBusyId(entry.id);
    setError("");
    const update =
      field === "is_starter"
        ? { is_starter: !entry.is_starter, updated_at: new Date().toISOString() }
        : { is_captain: !entry.is_captain, updated_at: new Date().toISOString() };
    const { error: updateError } = await supabase
      .from("squad_players")
      .update(update)
      .eq("id", entry.id);
    setBusyId("");
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onRefresh();
  };

  const removeSquadPlayer = async (id: string) => {
    setBusyId(id);
    setError("");
    const { error: deleteError } = await supabase
      .from("squad_players")
      .delete()
      .eq("id", id);
    setBusyId("");
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onRefresh();
  };

  const positions = ["ALL", "GK", "DEF", "MID", "FWD"];

  return (
    <div className="standard-view">
      <section className="view-heading">
        <div>
          <span className="muted-kicker">Gestión del equipo</span>
          <h1>Mi plantilla</h1>
        </div>
        <div className="squad-actions">
          {!demoMode && (
            <button
              className="secondary-button compact-button"
              onClick={() => setShowCsv(true)}
            >
              <Upload size={17} /> CSV
            </button>
          )}
          <button className="add-button" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Añadir
          </button>
        </div>
      </section>

      <div className="squad-summary">
        <div>
          <Users size={19} />
          <span>Jugadores</span>
          <strong>{demoMode ? demoPlayers.length : data.squad.length}</strong>
        </div>
        <div>
          <Star size={19} />
          <span>Titulares</span>
          <strong>
            {demoMode
              ? demoPlayers.filter((player) => player.is_starter).length
              : data.squad.filter((player) => player.is_starter).length}
          </strong>
        </div>
        <div>
          <Coins size={19} />
          <span>Valor</span>
          <strong>
            {formatMoney(
              demoMode
                ? demoPlayers.reduce(
                    (sum, player) => sum + player.current_value,
                    0,
                  )
                : data.squad.reduce(
                    (sum, player) => sum + (player.current_value ?? 0),
                    0,
                  ),
            )}
          </strong>
        </div>
      </div>

      <div className="chip-filter">
        {positions.map((position) => (
          <button
            key={position}
            className={filter === position ? "active" : ""}
            onClick={() => setFilter(position)}
          >
            {position === "ALL" ? "Todos" : position}
          </button>
        ))}
      </div>

      {error && <div className="form-alert error">{error}</div>}

      {demoMode ? (
        <div className="position-groups">
          {(["GK", "DEF", "MID", "FWD"] as const)
            .filter((position) => filter === "ALL" || filter === position)
            .map((position) => {
              const rows = demoPlayers.filter(
                (player) => player.position === position,
              );
              if (!rows.length) return null;
              return (
                <section key={position} className="position-section">
                  <div className="position-title">
                    <h2>{positionLabel[position]}</h2>
                    <span>{rows.length}</span>
                  </div>
                  {rows.map((player) => (
                    <DemoPlayerRow key={player.id} player={player} />
                  ))}
                </section>
              );
            })}
        </div>
      ) : liveRows.length ? (
        <div className="position-groups">
          {(["GK", "DEF", "MID", "FWD"] as const)
            .filter((position) => filter === "ALL" || filter === position)
            .map((position) => {
              const rows = liveRows.filter(
                (row) => row.position === position,
              );
              if (!rows.length) return null;
              return (
                <section key={position} className="position-section">
                  <div className="position-title">
                    <h2>{positionLabel[position]}</h2>
                    <span>{rows.length}</span>
                  </div>
                  {rows.map(({ entry, name, status, clubName }) => (
                    <article className="player-row" key={entry.id}>
                      <PlayerAvatar name={name} status={status} />
                      <div className="player-main">
                        <div>
                          <strong>{name}</strong>
                          {entry.is_captain && (
                            <span className="captain-chip">C</span>
                          )}
                        </div>
                        <span>{clubName}</span>
                      </div>
                      <div className="player-value">
                        <strong>{formatMoney(entry.current_value)}</strong>
                        <span className={`status-text ${status}`}>
                          {statusLabel[status] ?? "Sin datos"}
                        </span>
                      </div>
                      <div className="row-actions">
                        <button
                          className={entry.is_starter ? "active" : ""}
                          onClick={() => void toggleSquadFlag(entry, "is_starter")}
                          disabled={busyId === entry.id}
                          title="Alternar titular"
                        >
                          <Star size={16} />
                        </button>
                        <button
                          className={entry.is_captain ? "active captain" : ""}
                          onClick={() => void toggleSquadFlag(entry, "is_captain")}
                          disabled={busyId === entry.id}
                          title="Alternar capitán"
                        >
                          <Crown size={16} />
                        </button>
                        <button
                          onClick={() => void removeSquadPlayer(entry.id)}
                          disabled={busyId === entry.id}
                          title="Eliminar jugador"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              );
            })}
        </div>
      ) : (
        <EmptyCard
          icon={<Users size={22} />}
          title="Tu plantilla está vacía"
          detail="Añade jugadores manualmente o importa un CSV; no necesitas esperar al catálogo."
          action="Añadir jugador"
          onAction={() => setShowAdd(true)}
        />
      )}

      {showAdd && !demoMode && data.team && (
        <AddSquadModal
          team={data.team}
          players={data.players}
          clubs={data.clubs}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            onRefresh();
          }}
        />
      )}
      {showCsv && !demoMode && user && data.team && (
        <CsvImportModal
          user={user}
          team={data.team}
          players={data.players}
          existingSquad={data.squad}
          onClose={() => setShowCsv(false)}
          onSaved={() => {
            setShowCsv(false);
            onRefresh();
          }}
        />
      )}
      {showAdd && demoMode && (
        <InfoModal
          onClose={() => setShowAdd(false)}
          title="La demo no modifica datos"
          detail="Crea tu cuenta para añadir jugadores reales cuando el catálogo esté activo."
        />
      )}
    </div>
  );
}

function CatalogEmpty({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`catalog-empty ${compact ? "compact" : ""}`}>
      <span>
        <ListFilter size={22} />
      </span>
      <div>
        <strong>Catálogo pendiente de sincronizar</strong>
        <p>
          El catálogo externo todavía está vacío. Puedes añadir jugadores
          manualmente o importar un CSV y completar la plantilla igualmente.
        </p>
      </div>
    </div>
  );
}

function DemoPlayerRow({
  player,
}: {
  player: (typeof demoPlayers)[number];
}) {
  return (
    <article className="player-row">
      <PlayerAvatar name={player.full_name} status={player.status} />
      <div className="player-main">
        <div>
          <strong>{player.full_name}</strong>
          {player.is_captain && <span className="captain-chip">C</span>}
        </div>
        <span>{player.club}</span>
      </div>
      <div className="player-value">
        <strong>{formatMoney(player.current_value)}</strong>
        <span className={player.current_value >= player.purchase_price ? "positive" : "negative"}>
          {player.current_value >= player.purchase_price ? "+" : ""}
          {(
            ((player.current_value - player.purchase_price) /
              player.purchase_price) *
            100
          ).toFixed(1)}
          %
        </span>
      </div>
      <span className="form-score">{player.form.toFixed(1)}</span>
    </article>
  );
}

function PlayerAvatar({ name, status }: { name: string; status: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <span className="player-avatar">
      {initials}
      <i className={`avatar-status ${status}`} />
    </span>
  );
}

function AddSquadModal({
  team,
  players,
  clubs,
  onClose,
  onSaved,
}: {
  team: Team;
  players: Player[];
  clubs: Club[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"catalog" | "manual">(
    players.length > 0 ? "catalog" : "manual",
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Player | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPosition, setManualPosition] =
    useState<"GK" | "DEF" | "MID" | "FWD">("MID");
  const [manualClub, setManualClub] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [starter, setStarter] = useState(true);
  const [captain, setCaptain] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const clubsById = Object.fromEntries(clubs.map((club) => [club.id, club]));
  const results = players
    .filter((player) =>
      player.full_name.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 8);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "catalog" && !selected) return;
    if (mode === "manual" && !manualName.trim()) return;

    setSaving(true);
    setError("");

    const { error: insertError } = await supabase.from("squad_players").insert({
      fantasy_team_id: team.id,
      player_id: mode === "catalog" ? selected?.id ?? null : null,
      purchase_price: purchasePrice ? parseEuropeanNumber(purchasePrice) : null,
      current_value: currentValue ? parseEuropeanNumber(currentValue) : null,
      is_starter: starter,
      is_captain: captain,
      imported_name:
        mode === "catalog" ? selected?.full_name ?? null : manualName.trim(),
      imported_position:
        mode === "catalog" ? selected?.position ?? null : manualPosition,
      imported_club:
        mode === "catalog"
          ? selected?.club_id
            ? clubsById[selected.club_id]?.name ?? null
            : null
          : manualClub.trim() || null,
    });

    setSaving(false);
    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "Ese jugador ya está en tu plantilla."
          : insertError.message,
      );
      return;
    }
    onSaved();
  };

  return (
    <ModalShell onClose={onClose}>
      <form className="modal-form" onSubmit={save}>
        <span className="modal-kicker">Plantilla</span>
        <h2>Añadir jugador</h2>

        <div className="toggle-grid import-mode-toggle">
          <label>
            <input
              type="radio"
              name="player-mode"
              checked={mode === "manual"}
              onChange={() => {
                setMode("manual");
                setSelected(null);
              }}
            />
            <span>
              <FileText size={16} /> Manual
            </span>
          </label>
          <label className={players.length === 0 ? "disabled-option" : ""}>
            <input
              type="radio"
              name="player-mode"
              checked={mode === "catalog"}
              onChange={() => setMode("catalog")}
              disabled={players.length === 0}
            />
            <span>
              <Search size={16} /> Catálogo
            </span>
          </label>
        </div>

        {mode === "manual" ? (
          <>
            <label>
              Nombre del jugador
              <input
                autoFocus
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
                placeholder="Ej. Oihan Sancet"
                required
              />
            </label>
            <div className="two-column-fields">
              <label>
                Posición
                <select
                  value={manualPosition}
                  onChange={(event) =>
                    setManualPosition(
                      event.target.value as "GK" | "DEF" | "MID" | "FWD",
                    )
                  }
                >
                  <option value="GK">Portero</option>
                  <option value="DEF">Defensa</option>
                  <option value="MID">Centrocampista</option>
                  <option value="FWD">Delantero</option>
                </select>
              </label>
              <label>
                Club <small>opcional</small>
                <input
                  value={manualClub}
                  onChange={(event) => setManualClub(event.target.value)}
                  placeholder="Ej. Athletic"
                />
              </label>
            </div>
          </>
        ) : !selected ? (
          <>
            <label>
              Buscar en el catálogo
              <div className="search-input">
                <Search size={18} />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nombre del jugador"
                />
              </div>
            </label>
            <div className="player-search-results">
              {results.map((player) => (
                <button
                  type="button"
                  key={player.id}
                  onClick={() => setSelected(player)}
                >
                  <PlayerAvatar name={player.full_name} status={player.status} />
                  <span>
                    <strong>{player.full_name}</strong>
                    <small>
                      {player.position} ·{" "}
                      {player.club_id
                        ? clubsById[player.club_id]?.name ?? "Sin club"
                        : "Sin club"}
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <button
            type="button"
            className="selected-player"
            onClick={() => setSelected(null)}
          >
            <PlayerAvatar name={selected.full_name} status={selected.status} />
            <span>
              <strong>{selected.full_name}</strong>
              <small>{selected.position} · Cambiar</small>
            </span>
            <RefreshCw size={17} />
          </button>
        )}

        {(mode === "manual" || selected) && (
          <>
            <div className="two-column-fields">
              <label>
                Precio de compra <small>opcional</small>
                <div className="input-with-suffix">
                  <input
                    value={purchasePrice}
                    onChange={(event) => setPurchasePrice(event.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                  />
                  <span>€</span>
                </div>
              </label>
              <label>
                Valor actual <small>opcional</small>
                <div className="input-with-suffix">
                  <input
                    value={currentValue}
                    onChange={(event) => setCurrentValue(event.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                  />
                  <span>€</span>
                </div>
              </label>
            </div>
            <div className="toggle-grid">
              <label>
                <input
                  type="checkbox"
                  checked={starter}
                  onChange={(event) => setStarter(event.target.checked)}
                />
                <span>
                  <Star size={16} /> Titular
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={captain}
                  onChange={(event) => setCaptain(event.target.checked)}
                />
                <span>
                  <Crown size={16} /> Capitán
                </span>
              </label>
            </div>
          </>
        )}

        {error && <div className="form-alert error">{error}</div>}
        <button
          className="primary-button full"
          disabled={
            saving ||
            (mode === "catalog" ? !selected : !manualName.trim())
          }
        >
          {saving ? <LoaderCircle className="spin" size={18} /> : "Guardar jugador"}
        </button>
      </form>
    </ModalShell>
  );
}

function CsvImportModal({
  user,
  team,
  players,
  existingSquad,
  onClose,
  onSaved,
}: {
  user: User;
  team: Team;
  players: Player[];
  existingSquad: SquadPlayer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] =
    useState<ReturnType<typeof parseSquadCsv> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsed(null);
    setError("");

    try {
      const text = await file.text();
      setParsed(parseSquadCsv(text));
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "No se ha podido leer el CSV.",
      );
    }
  };

  const importRows = async () => {
    if (!parsed) return;
    setSaving(true);
    setError("");

    let batchId: string | null = null;

    try {
      const { data: batch, error: batchError } = await supabase
        .from("import_batches")
        .insert({
          user_id: user.id,
          fantasy_team_id: team.id,
          import_type: "squad",
          method: "csv",
          status: "processing",
          rows_total: parsed.rows.length,
          rows_matched: 0,
          rows_unmatched: 0,
        })
        .select("id")
        .single();

      if (batchError || !batch) {
        throw batchError ?? new Error("No se ha podido crear la importación.");
      }
      batchId = batch.id;

      const playersByName = new Map(
        players.map((player) => [
          normalizePlayerName(player.full_name),
          player,
        ]),
      );
      const existingPlayerIds = new Set(
        existingSquad
          .map((entry) => entry.player_id)
          .filter((id): id is string => Boolean(id)),
      );
      const existingImportedNames = new Set(
        existingSquad
          .map((entry) =>
            entry.imported_name
              ? normalizePlayerName(entry.imported_name)
              : "",
          )
          .filter(Boolean),
      );

      let catalogMatches = 0;
      const items = parsed.rows.map((row) => {
        const matched = playersByName.get(normalizePlayerName(row.name)) ?? null;
        if (matched) catalogMatches += 1;
        return {
          import_batch_id: batch.id,
          row_number: row.rowNumber,
          raw_name: row.name,
          raw_position: row.position,
          raw_club: row.club,
          raw_value: row.value,
          matched_player_id: matched?.id ?? null,
          match_confidence: matched ? 1 : null,
          review_status: matched ? "matched" as const : "confirmed" as const,
          notes: matched
            ? "Coincidencia exacta con el catálogo"
            : "Importado como jugador manual",
        };
      });

      const { error: itemsError } = await supabase
        .from("import_items")
        .insert(items);
      if (itemsError) throw itemsError;

      const squadRows = parsed.rows.flatMap((row) => {
        const normalizedName = normalizePlayerName(row.name);
        const matched = playersByName.get(normalizedName) ?? null;

        if (matched && existingPlayerIds.has(matched.id)) return [];
        if (!matched && existingImportedNames.has(normalizedName)) return [];

        return [{
          fantasy_team_id: team.id,
          player_id: matched?.id ?? null,
          purchase_price: null,
          current_value: row.value,
          is_starter: false,
          is_captain: false,
          imported_name: row.name,
          imported_position: matched?.position ?? row.position,
          imported_club: row.club,
        }];
      });

      if (squadRows.length > 0) {
        const { error: squadError } = await supabase
          .from("squad_players")
          .insert(squadRows);
        if (squadError) throw squadError;
      }

      const { error: completeError } = await supabase
        .from("import_batches")
        .update({
          status: "completed",
          rows_matched: catalogMatches,
          rows_unmatched: parsed.rows.length - catalogMatches,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batch.id);
      if (completeError) throw completeError;

      await supabase
        .from("onboarding_progress")
        .update({
          selected_import_method: "csv",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      onSaved();
    } catch (importError) {
      if (batchId) {
        await supabase
          .from("import_batches")
          .update({
            status: "failed",
            error_message:
              importError instanceof Error
                ? importError.message
                : "Error de importación",
          })
          .eq("id", batchId);
      }
      setError(
        importError instanceof Error
          ? importError.message
          : "No se ha podido completar la importación.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="modal-form">
        <span className="modal-kicker">Plantilla</span>
        <h2>Importar CSV</h2>
        <p className="modal-intro">
          Incluye una cabecera con <strong>Nombre</strong> o{" "}
          <strong>Jugador</strong>. Posición, club y valor son opcionales.
        </p>

        <label className="csv-dropzone">
          <Upload size={24} />
          <strong>{fileName || "Selecciona un archivo CSV"}</strong>
          <span>Máximo 200 jugadores y 256 KB</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(event) => void readFile(event)}
          />
        </label>

        <div className="csv-example">
          <span>Ejemplo</span>
          <code>Nombre;Posición;Club;Valor</code>
          <code>Oihan Sancet;MED;Athletic;18.400.000</code>
        </div>

        {parsed && (
          <>
            <div className="csv-summary">
              <div>
                <strong>{parsed.rows.length}</strong>
                <span>jugadores válidos</span>
              </div>
              <div>
                <strong>{parsed.warnings.length}</strong>
                <span>avisos</span>
              </div>
            </div>
            <div className="csv-preview">
              {parsed.rows.slice(0, 6).map((row: CsvSquadRow) => (
                <article key={row.rowNumber}>
                  <span className="player-avatar compact-avatar">
                    {row.name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <span>
                    <strong>{row.name}</strong>
                    <small>
                      {row.position ?? "Sin posición"} · {row.club ?? "Sin club"}
                    </small>
                  </span>
                  <strong>{formatMoney(row.value)}</strong>
                </article>
              ))}
            </div>
            {parsed.warnings.length > 0 && (
              <details className="csv-warnings">
                <summary>Ver avisos ({parsed.warnings.length})</summary>
                <ul>
                  {parsed.warnings.slice(0, 8).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}

        {error && <div className="form-alert error">{error}</div>}
        <button
          className="primary-button full"
          onClick={() => void importRows()}
          disabled={!parsed || saving}
        >
          {saving ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <>
              <Upload size={18} /> Importar plantilla
            </>
          )}
        </button>
      </div>
    </ModalShell>
  );
}

function MarketView({
  demoMode,
  data,
  onRefresh,
}: {
  demoMode: boolean;
  data: LiveData;
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const playersById = Object.fromEntries(
    data.players.map((player) => [player.id, player]),
  );
  const clubsById = Object.fromEntries(data.clubs.map((club) => [club.id, club]));
  const liveCards = data.market
    .map((entry) => ({
      entry,
      player: playersById[entry.player_id],
    }))
    .filter((row) => row.player)
    .filter(({ player }) =>
      player.full_name.toLowerCase().includes(query.toLowerCase()),
    );
  const demoCards = demoMarket.filter((entry) =>
    entry.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="standard-view">
      <section className="view-heading">
        <div>
          <span className="muted-kicker">Oportunidades de tu liga</span>
          <h1>Mercado</h1>
        </div>
        <button
          className="add-button"
          onClick={() => setShowAdd(true)}
          disabled={!demoMode && data.players.length === 0}
        >
          <Plus size={18} /> Añadir
        </button>
      </section>

      <div className="market-search-row">
        <div className="search-input">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar jugador"
          />
        </div>
        <button aria-label="Filtrar">
          <ListFilter size={19} />
        </button>
      </div>

      <div className="market-insight">
        <Zap size={19} />
        <div>
          <strong>
            {demoMode ? "2 oportunidades encajan con tu equipo" : "Análisis del mercado"}
          </strong>
          <span>
            {demoMode
              ? "Ordenadas por valor esperado y necesidad de posición."
              : "El Copilot priorizará fichajes cuando haya datos de jugadores."}
          </span>
        </div>
      </div>

      {demoMode ? (
        <div className="market-grid">
          {demoCards.map((entry, index) => (
            <article className="market-card" key={entry.id}>
              <div className="market-card-top">
                <PlayerAvatar name={entry.name} status="available" />
                <div>
                  <strong>{entry.name}</strong>
                  <span>{entry.position} · {entry.club}</span>
                </div>
                <span className={`market-rank ${index === 0 ? "best" : ""}`}>
                  {entry.score}
                </span>
              </div>
              <div className="market-prices">
                <div>
                  <span>Precio pedido</span>
                  <strong>{formatMoney(entry.price)}</strong>
                </div>
                <div>
                  <span>Valor actual</span>
                  <strong>{formatMoney(entry.value)}</strong>
                </div>
                <div>
                  <span>Tendencia</span>
                  <strong className={entry.trend >= 0 ? "positive" : "negative"}>
                    {entry.trend >= 0 ? "+" : ""}{entry.trend}%
                  </strong>
                </div>
              </div>
              <div className="market-footer">
                <span><Clock3 size={15} /> {entry.expires}</span>
                <button>Analizar <ChevronRight size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : liveCards.length ? (
        <div className="market-grid">
          {liveCards.map(({ entry, player }) => (
            <article className="market-card" key={entry.id}>
              <div className="market-card-top">
                <PlayerAvatar name={player.full_name} status={player.status} />
                <div>
                  <strong>{player.full_name}</strong>
                  <span>
                    {player.position} ·{" "}
                    {player.club_id
                      ? clubsById[player.club_id]?.short_name ?? "Sin club"
                      : "Sin club"}
                  </span>
                </div>
              </div>
              <div className="market-prices">
                <div>
                  <span>Precio pedido</span>
                  <strong>{formatMoney(entry.asking_price)}</strong>
                </div>
                <div>
                  <span>Valor actual</span>
                  <strong>{formatMoney(entry.market_value)}</strong>
                </div>
                <div>
                  <span>Vendedor</span>
                  <strong>{entry.seller_name ?? "Mercado"}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : data.players.length === 0 ? (
        <CatalogEmpty />
      ) : (
        <EmptyCard
          icon={<ShoppingBag size={22} />}
          title="El mercado está vacío"
          detail="Añade manualmente los jugadores disponibles en tu liga."
          action="Añadir jugador"
          onAction={() => setShowAdd(true)}
        />
      )}

      {showAdd && demoMode && (
        <InfoModal
          onClose={() => setShowAdd(false)}
          title="La demo no modifica datos"
          detail="Crea tu cuenta para guardar el mercado de tu liga."
        />
      )}
      {showAdd && !demoMode && data.team && (
        <AddMarketModal
          team={data.team}
          players={data.players}
          clubs={data.clubs}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function AddMarketModal({
  team,
  players,
  clubs,
  onClose,
  onSaved,
}: {
  team: Team;
  players: Player[];
  clubs: Club[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [playerId, setPlayerId] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [marketValue, setMarketValue] = useState("");
  const [seller, setSeller] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const clubsById = Object.fromEntries(clubs.map((club) => [club.id, club]));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("market_entries").insert({
      fantasy_team_id: team.id,
      player_id: playerId,
      asking_price: askingPrice ? parseEuropeanNumber(askingPrice) : null,
      market_value: marketValue ? parseEuropeanNumber(marketValue) : null,
      seller_name: seller.trim() || null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      source: "manual",
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onSaved();
  };

  return (
    <ModalShell onClose={onClose}>
      <form className="modal-form" onSubmit={save}>
        <span className="modal-kicker">Mercado</span>
        <h2>Añadir oportunidad</h2>
        <label>
          Jugador
          <select value={playerId} onChange={(event) => setPlayerId(event.target.value)} required>
            <option value="">Selecciona un jugador</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.full_name} · {player.position} ·{" "}
                {player.club_id ? clubsById[player.club_id]?.short_name : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Precio solicitado
          <div className="input-with-suffix">
            <input
              value={askingPrice}
              onChange={(event) => setAskingPrice(event.target.value)}
              inputMode="decimal"
              required
            />
            <span>€</span>
          </div>
        </label>
        <label>
          Valor de mercado
          <div className="input-with-suffix">
            <input
              value={marketValue}
              onChange={(event) => setMarketValue(event.target.value)}
              inputMode="decimal"
            />
            <span>€</span>
          </div>
        </label>
        <label>
          Vendedor <small>opcional</small>
          <input value={seller} onChange={(event) => setSeller(event.target.value)} />
        </label>
        <label>
          Expira <small>opcional</small>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </label>
        {error && <div className="form-alert error">{error}</div>}
        <button className="primary-button full" disabled={saving}>
          {saving ? <LoaderCircle className="spin" size={18} /> : "Guardar en mercado"}
        </button>
      </form>
    </ModalShell>
  );
}

function ProfileView({
  demoMode,
  user,
  data,
  onExitDemo,
  onRefresh,
}: {
  demoMode: boolean;
  user: User | null;
  data: LiveData;
  onExitDemo: () => void;
  onRefresh: () => void;
}) {
  const [name, setName] = useState(data.profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showCsv, setShowCsv] = useState(false);
  const [showConnector, setShowConnector] = useState(false);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    setMessage(error ? error.message : "Perfil actualizado.");
    if (!error) onRefresh();
  };

  const resetOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("onboarding_progress")
      .upsert({
        user_id: user.id,
        current_step: 3,
        completed: false,
        selected_import_method: "manual",
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    onRefresh();
  };

  return (
    <div className="standard-view profile-view">
      <section className="view-heading">
        <div>
          <span className="muted-kicker">Cuenta y configuración</span>
          <h1>Perfil</h1>
        </div>
      </section>

      <div className="profile-hero">
        <span className="large-avatar">
          {(demoMode ? "Iñigo Contreras" : data.profile?.display_name || user?.email || "FC")
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("")}
        </span>
        <div>
          <strong>
            {demoMode ? "Iñigo Contreras" : data.profile?.display_name || "Míster"}
          </strong>
          <span>{demoMode ? "demo@fantasycopilot.app" : user?.email}</span>
        </div>
        <span className="plan-chip">MVP</span>
      </div>

      <LaligaConnectionCard onOpen={() => setShowConnector(true)} />

      {!demoMode && (
        <section className="settings-card">
          <h2>Datos del perfil</h2>
          <label>
            Nombre visible
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Email
            <input value={user?.email ?? ""} disabled />
          </label>
          {message && <div className="form-alert success">{message}</div>}
          <button className="secondary-button" onClick={() => void saveProfile()} disabled={saving}>
            Guardar cambios
          </button>
        </section>
      )}

      <section className="settings-card">
        <h2>Estado del producto</h2>
        <div className="setting-row">
          <span className="setting-icon success"><Check size={18} /></span>
          <div>
            <strong>Autenticación y seguridad</strong>
            <small>Configuradas y verificadas</small>
          </div>
          <ChevronRight size={18} />
        </div>
        <div className="setting-row">
          <span className="setting-icon"><Users size={18} /></span>
          <div>
            <strong>Catálogo de jugadores</strong>
            <small>{demoMode ? "Datos de demostración" : `${data.players.length} jugadores disponibles`}</small>
          </div>
          <ChevronRight size={18} />
        </div>
        <div className="setting-row">
          <span className="setting-icon warning"><Activity size={18} /></span>
          <div>
            <strong>Fuente externa</strong>
            <small>Contexto deportivo pendiente de activación</small>
          </div>
          <ChevronRight size={18} />
        </div>
      </section>

      {!demoMode && (
        <section className="settings-card">
          <h2>Importación</h2>
          {data.team && (
            <button className="setting-button" onClick={() => setShowCsv(true)}>
              <Upload size={18} />
              <span>
                <strong>Importar plantilla CSV</strong>
                <small>Nombre, posición, club y valor</small>
              </span>
              <ChevronRight size={18} />
            </button>
          )}
          <button className="setting-button" onClick={() => void resetOnboarding()} disabled={saving}>
            <RefreshCw size={18} />
            <span>
              <strong>Reiniciar carga de plantilla</strong>
              <small>No borra tu cuenta</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </section>
      )}

      {demoMode ? (
        <button className="primary-button full" onClick={onExitDemo}>
          Crear mi cuenta <ArrowRight size={18} />
        </button>
      ) : (
        <button
          className="danger-button"
          onClick={() => void supabase.auth.signOut()}
        >
          <LogOut size={18} /> Cerrar sesión
        </button>
      )}

      <p className="security-note">
        <ShieldCheck size={15} />
        Fantasy Copilot no almacena credenciales de LALIGA Fantasy.
      </p>

      {showConnector && (
        <LaligaConnectionModal onClose={() => setShowConnector(false)} />
      )}
      {showCsv && !demoMode && user && data.team && (
        <CsvImportModal
          user={user}
          team={data.team}
          players={data.players}
          existingSquad={data.squad}
          onClose={() => setShowCsv(false)}
          onSaved={() => {
            setShowCsv(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function LaligaConnectionCard({ onOpen }: { onOpen: () => void }) {
  const state = getLaligaConnectorState();

  return (
    <section className="connection-card">
      <span className="connection-icon">
        <LockKeyhole size={22} />
      </span>
      <div>
        <span className="modal-kicker">Conexión LALIGA Fantasy</span>
        <strong>{state.title}</strong>
        <p>
          Mientras no exista permiso escrito, la app no pedirá tu contraseña ni
          llamará a endpoints privados.
        </p>
      </div>
      <button className="secondary-button compact-button" onClick={onOpen}>
        Ver estado
      </button>
    </section>
  );
}

function LaligaConnectionModal({ onClose }: { onClose: () => void }) {
  const state = getLaligaConnectorState();

  return (
    <ModalShell onClose={onClose}>
      <div className="connection-modal">
        <span className="connection-hero-icon">
          <ShieldCheck size={28} />
        </span>
        <span className="modal-kicker">Decisión de seguridad</span>
        <h2>{state.title}</h2>
        <p>{state.detail}</p>
        <ul className="check-list compact-list">
          <li>
            <Check size={17} /> Manual y CSV siguen disponibles
          </li>
          <li>
            <Check size={17} /> Adaptador preparado sin endpoints copiados
          </li>
          <li>
            <Check size={17} /> Piloto automático desactivado
          </li>
        </ul>
        <a
          className="secondary-button full"
          href={state.legalSourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Leer condiciones oficiales <ExternalLink size={17} />
        </a>
        <button className="primary-button full" onClick={onClose}>
          Entendido
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

function InfoModal({
  onClose,
  title,
  detail,
}: {
  onClose: () => void;
  title: string;
  detail: string;
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className="info-modal">
        <span><Info size={24} /></span>
        <h2>{title}</h2>
        <p>{detail}</p>
        <button className="primary-button full" onClick={onClose}>Entendido</button>
      </div>
    </ModalShell>
  );
}
