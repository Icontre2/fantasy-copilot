"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { BellRing, CircleEllipsis, House, ShieldCheck, ShoppingBag, TriangleAlert, UsersRound } from "lucide-react";
import { get, olvidarCache, post } from "./api";
import { AlertsView } from "./AlertsView";
import { EconomyView } from "./EconomyView";
import { ExportView } from "./ExportView";
import { CalendarView } from "./CalendarView";
import { LeagueView } from "./LeagueView";
import { LoginView } from "./LoginView";
import { MarketView } from "./MarketView";
import { CompareView } from "./CompareView";
import { LineupsView, type LineupsResponse } from "./LineupsView";
import { DashboardView } from "./DashboardView";
import { MySquadView } from "./MySquadView";
import { MoreView } from "./MoreView";
import type { EstadoSocial } from "./CuentaView";
import { SECTIONS, type AlertsResponse, type EconomyResponse, type DashboardResponse, type DiagnosticoDeSesion, type League, type Proveedor, type LeaguesResponse, type Manager, type MarketResponse, type Section, type TeamsResponse } from "./types";
import { Card, ErrorBox, Spinner } from "./ui";
import { AppInstalable, useServiceWorkerDeApp } from "./AppInstalable";
import { LigaProvider } from "./league-context";

export default function FantasyApp() {
  useServiceWorkerDeApp();
  const [manager, setManager] = useState<Manager | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sesion, setSesion] = useState<DiagnosticoDeSesion | null>(null);
  const [social, setSocial] = useState<{ proveedores: Proveedor[]; identificado: boolean; motivo?: string | null } | null>(null);
  const [errorDeAcceso, setErrorDeAcceso] = useState<string | null>(null);
  const [avisoDeAcceso, setAvisoDeAcceso] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [leaguesLoading, setLeaguesLoading] = useState(true);
  const [leaguesError, setLeaguesError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("inicio");

  useEffect(() => {
    get<{ authenticated: boolean; manager?: Manager; session?: DiagnosticoDeSesion; social?: { proveedores: Proveedor[]; identificado: boolean; motivo?: string | null }; authError?: string | null; authAviso?: string | null }>("/api/fantasy/auth/session")
      .then((data) => {
        setManager(data.authenticated && data.manager ? data.manager : null);
        setSesion(data.session ?? null);
        setSocial(data.social ?? null);
        setErrorDeAcceso(data.authError ?? null);
        setAvisoDeAcceso(data.authAviso ?? null);
      })
      .catch(() => setManager(null))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!manager) return;
    get<LeaguesResponse>("/api/fantasy/leagues")
      .then((data) => {
        setLeagues(data.leagues);
        setLeagueId((current) => current ?? data.leagues[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        setLeagues([]);
        setLeagueId(null);
        setLeaguesError(error instanceof Error ? error.message : "No se pudieron cargar tus ligas.");
      })
      .finally(() => setLeaguesLoading(false));
  }, [manager]);

  async function logout() {
    await post("/api/fantasy/auth/logout").catch(() => undefined);
    setLeagues([]); setLeagueId(null); setLeaguesLoading(true); setLeaguesError(null); setManager(null);
  }

  if (checkingSession) return <Shell><Spinner label="Comprobando sesión…" /></Shell>;
  if (!manager) return <Shell><LoginView onLogin={setManager} sesion={sesion} social={social} errorDeAcceso={errorDeAcceso} avisoDeAcceso={avisoDeAcceso} /></Shell>;

  return (
    <Shell>
      <header className="flex items-center justify-between gap-3 pt-1">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#7c3aed] text-lg font-black text-white shadow-[0_0_28px_rgba(124,58,237,.35)]">LL</span>
          <div className="min-w-0"><p className="text-xs font-medium text-neutral-400">LigaLab</p><p className="truncate font-bold text-white">Hola, {manager.name}</p></div>
        </div>
        <button type="button" onClick={() => setSection("mas")} aria-label="Abrir perfil" className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-[#7c3aed]/20 shadow-[0_0_24px_rgba(124,58,237,.22)]">
          {manager.avatar ? <Image src={manager.avatar} alt={`Foto de ${manager.name}`} fill sizes="48px" unoptimized className="object-cover" /> : <span className="text-sm font-black text-[#c4b5fd]">{manager.name.slice(0, 1).toUpperCase()}</span>}
        </button>
      </header>
      {avisoDeAcceso && <p className="flex gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[12px] leading-4 text-emerald-200" role="status"><ShieldCheck size={16} className="mt-px shrink-0" /><span>{avisoDeAcceso}</span></p>}
      {errorDeAcceso && <p className="flex gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] leading-4 text-amber-200" role="status"><TriangleAlert size={16} className="mt-px shrink-0" /><span>{errorDeAcceso}</span></p>}
      <AppInstalable />
      {leagues.length > 1 && <label className="block"><span className="mb-1 block text-sm font-medium">Liga</span><select value={leagueId ?? ""} onChange={(event) => setLeagueId(event.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2">{leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}</select></label>}
      {leaguesLoading ? <Spinner label="Cargando tus ligas…" /> : leaguesError ? <ErrorBox message={leaguesError} /> : leagueId ? <LigaProvider leagueId={leagueId}><SectionContent section={section} leagueId={leagueId} onNavigate={setSection} social={social} /></LigaProvider> : <Card><p className="text-sm text-neutral-600">Tu cuenta no tiene ninguna liga en esta competición.</p></Card>}
      <BottomNav section={section} onSelect={setSection}/>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) { return <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">{children}</main>; }
const NAV_ICONS: Record<string, React.ReactNode> = { inicio: <House size={20}/>, plantilla: <UsersRound size={20}/>, mercado: <ShoppingBag size={20}/>, alertas: <BellRing size={20}/>, mas: <CircleEllipsis size={20}/> };
function BottomNav({ section, onSelect }: { section: Section; onSelect: (section: Section) => void }) { const active = SECTIONS.some((item) => item.id === section) ? section : "mas"; return <nav className="glass-nav fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 mx-auto grid max-w-md grid-cols-5 rounded-[24px] p-1.5 text-white">{SECTIONS.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] text-[10px] font-semibold transition ${active === item.id ? "bg-[#7c3aed] text-white shadow-[0_6px_18px_rgba(124,58,237,.5)]" : "text-white/50"}`} aria-current={active === item.id ? "page" : undefined}>{NAV_ICONS[item.id]}{item.label}</button>)}</nav>; }

function SectionContent({ section, leagueId, onNavigate, social }: { section: Section; leagueId: string; onNavigate: (section: Section) => void; social: EstadoSocial | null }) {
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => { olvidarCache(); setReloadToken((value) => value + 1); }, []);
  if (section === "exportar") return <ExportView leagueId={leagueId} />;
  if (section === "jornadas") return <CalendarView />;
  if (section === "mas") return <MoreView onSelect={onNavigate} social={social} />;
  return <SectionData key={`${section}-${leagueId}-${reloadToken}`} section={section} leagueId={leagueId} onSynced={reload} />;
}

type DataSection = Exclude<Section, "exportar" | "mas" | "jornadas">;
const ENDPOINT: Record<DataSection, (leagueId: string) => string> = { inicio: (id) => `/api/fantasy/leagues/${id}/dashboard`, plantilla: (id) => `/api/fantasy/leagues/${id}/dashboard`, liga: (id) => `/api/fantasy/leagues/${id}/teams`, alertas: (id) => `/api/fantasy/leagues/${id}/alerts`, economia: (id) => `/api/fantasy/leagues/${id}/economy`, mercado: (id) => `/api/fantasy/leagues/${id}/market`, comparar: (id) => `/api/fantasy/leagues/${id}/teams`, onces: () => `/api/fantasy/lineups` };
const LOADING_LABEL: Record<DataSection, string> = { inicio: "Preparando tu resumen…", plantilla: "Montando tu once probable…", liga: "Cargando plantillas de la liga…", alertas: "Calculando alertas de cláusula…", economia: "Reconstruyendo la contabilidad…", mercado: "Cargando el mercado…", comparar: "Cargando jugadores…", onces: "Consultando onces probables…" };
function SectionData({ section, leagueId, onSynced }: { section: DataSection; leagueId: string; onSynced: () => void }) {
  const [data, setData] = useState<unknown>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { let cancelled = false; get<unknown>(ENDPOINT[section](leagueId)).then((result) => { if (!cancelled) setData(result); }).catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "No se pudo cargar."); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [section, leagueId]);
  if (loading) return <Spinner label={LOADING_LABEL[section]} />; if (error) return <ErrorBox message={error} />; if (!data) return null;
  switch (section) { case "inicio": return <DashboardView data={data as DashboardResponse} />; case "plantilla": return <MySquadView data={data as DashboardResponse} />; case "liga": return <LeagueView data={data as TeamsResponse} leagueId={leagueId} />; case "alertas": return <AlertsView data={data as AlertsResponse} onChanged={onSynced} />; case "economia": return <EconomyView data={data as EconomyResponse} />; case "mercado": return <MarketView data={data as MarketResponse} leagueId={leagueId} onChanged={onSynced} />; case "comparar": return <CompareView data={data as TeamsResponse} />; case "onces": return <LineupsView data={data as LineupsResponse} />; }
}
