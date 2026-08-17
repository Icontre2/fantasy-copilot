# Graph Report - fantasy-copilot  (2026-08-17)

## Corpus Check
- 164 files · ~95,197 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1083 nodes · 2367 edges · 63 communities (57 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `935a4771`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- errorJson
- session.ts
- clause-alerts.ts
- lineups.ts
- social/start/route.ts
- team-difficulty.ts
- Package Dependencies
- App Shell & Demo Data
- LeagueView.tsx
- export/market/route.ts
- AlertsView.tsx
- DashboardView.tsx
- FantasyApp.tsx
- api.ts
- privateFetch
- devDependencies
- Data Mappers
- get
- read.ts
- CSV Squad Import
- Bottom Sheet Gestures
- SquadValueHistory.tsx
- compilerOptions
- PlayerDetails.tsx
- iOS OAuth Plugin
- LaLiga Connector
- Calendar & Odds View
- MarketView.tsx
- Supabase Database Types
- Fantasy
- millions
- catalog-enrich.ts
- Onboarding & Demo Modals
- Weekly Points Data
- completarCajas
- Root Layout
- Team
- writes.ts
- ESLint Config
- Next.js Config
- fantasy.ts
- activity.ts
- bid/route.ts
- Traspaso: estado real del proyecto y qué falta
- Dirección visual (obligatoria)
- football-data.ts
- PostCSS Config
- Vercel Config
- difficulty/route.ts
- getLeagueSnapshot
- buyout/route.ts
- laliga/teams.ts
- value-history/route.ts
- Arquitectura
- Integración LALIGA Fantasy en modo lectura
- Prompt maestro para Lovable
- lineup.ts
- Modelo de datos
- LigaLab en iPhone — login social de LALIGA
- 2026-07-26 — `support_manual_squad_import`
- Acceso con cuentas sociales de LALIGA Fantasy
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `privateJson()` - 48 edges
2. `errorJson()` - 48 edges
3. `requireSession()` - 39 edges
4. `millions()` - 27 edges
5. `getLeagueSnapshot()` - 24 edges
6. `get()` - 20 edges
7. `compilerOptions` - 18 edges
8. `getMyProfile()` - 17 edges
9. `Player` - 16 edges
10. `getPlayerCatalog()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `errorJson()`  [EXTRACTED]
  app/api/fantasy/auth/login/route.ts → src/server/http/responses.ts
- `POST()` --calls--> `privateJson()`  [EXTRACTED]
  app/api/fantasy/auth/login/route.ts → src/server/http/responses.ts
- `POST()` --calls--> `limpiarUsuario()`  [EXTRACTED]
  app/api/fantasy/auth/logout/route.ts → src/server/auth/cookies.ts
- `POST()` --calls--> `errorJson()`  [EXTRACTED]
  app/api/fantasy/auth/mobile/complete/route.ts → src/server/http/responses.ts
- `POST()` --calls--> `privateJson()`  [EXTRACTED]
  app/api/fantasy/auth/mobile/complete/route.ts → src/server/http/responses.ts

## Import Cycles
- None detected.

## Communities (63 total, 6 thin omitted)

### Community 0 - "errorJson"
Cohesion: 0.15
Nodes (27): dynamic, GET(), dynamic, GET(), maxDuration, dynamic, maxDuration, dynamic (+19 more)

### Community 1 - "session.ts"
Cohesion: 0.05
Nodes (88): dynamic, POST(), POST(), clearOAuthCookie(), decodeState(), dynamic, OAuthState, POST() (+80 more)

### Community 2 - "clause-alerts.ts"
Cohesion: 0.13
Nodes (20): ClauseAlertsReport, mapWithConcurrency(), MAX_HISTORY_REQUESTS, PREFILTER_VALUE_RATIO, AlertLevel, buildAlert(), buildClauseAlerts(), classify() (+12 more)

### Community 3 - "lineups.ts"
Cohesion: 0.18
Nodes (15): fetchTeam(), getProbableLineups(), getProbableTeam(), headers, mapConcurrent(), ProbableTeam, matchExternalPlayer(), normalizePlayerName() (+7 more)

### Community 4 - "social/start/route.ts"
Cohesion: 0.11
Nodes (36): dynamic, dynamic, GET(), dynamic, GET(), RFC-7636, atributos(), COOKIE_ERROR (+28 more)

### Community 5 - "team-difficulty.ts"
Cohesion: 0.29
Nodes (8): CuotasPartido, dificultad(), esCuotaValida(), probabilidades, Resultado, dificultadPorEquipo(), PartidoConCuotas, partido()

### Community 6 - "Package Dependencies"
Cohesion: 0.05
Nodes (36): cheerio, drizzle-orm, lucide-react, next, dependencies, cheerio, drizzle-orm, lucide-react (+28 more)

### Community 7 - "App Shell & Demo Data"
Cohesion: 0.07
Nodes (18): AuthMode, AuthPanel(), Club, demoMarket, demoPlayers, emptyLiveData, LiveData, MarketEntry (+10 more)

### Community 8 - "LeagueView.tsx"
Cohesion: 0.27
Nodes (6): ExportView(), OnceDelRival(), RivalLineup, Card(), SectionTitle(), Spinner()

### Community 9 - "export/market/route.ts"
Cohesion: 0.14
Nodes (23): dynamic, GET(), dynamic, GET(), RFC-4180, MarketEntry, csvResponse(), CsvColumn (+15 more)

### Community 10 - "AlertsView.tsx"
Cohesion: 0.13
Nodes (19): AlertCard(), blindaje(), Filter, FILTERS, LEVEL_STYLE, motivoSinTendencia(), EconomyView(), KIND_LABEL (+11 more)

### Community 11 - "DashboardView.tsx"
Cohesion: 0.11
Nodes (19): chartCoordinates(), currentPoint(), DashboardView(), filterHistory(), historyCache, isPortfolioPoint(), localDate(), MiniChart() (+11 more)

### Community 12 - "FantasyApp.tsx"
Cohesion: 0.08
Nodes (23): BottomNav(), DataSection, ENDPOINT, LOADING_LABEL, NAV_ICONS, LineupsResponse, LineupsView(), LoginView() (+15 more)

### Community 13 - "api.ts"
Cohesion: 0.18
Nodes (14): del(), post(), request(), FantasyApp(), logout(), CapacitorWindow, getNativeLaligaOAuth(), hasNativeLaligaOAuth() (+6 more)

### Community 14 - "privateFetch"
Cohesion: 0.29
Nodes (8): privateFetch(), mapLeagueTeam(), mapManager(), mapSquadPlayer(), mapStandingRow(), getCurrentWeek(), getLeagueStanding(), getLeagueTeams()

### Community 15 - "devDependencies"
Cohesion: 0.06
Nodes (35): @cloudflare/vite-plugin, @cloudflare/workers-types, drizzle-kit, eslint, eslint-config-next, devDependencies, @cloudflare/vite-plugin, @cloudflare/workers-types (+27 more)

### Community 16 - "Data Mappers"
Cohesion: 0.13
Nodes (18): mapLeague(), mapMarketEntry(), mapMarketValueHistory(), mapPlayerMaster(), POSITION_BY_ID, POSITION_ORDER, toPosition(), resolveTeamId() (+10 more)

### Community 17 - "get"
Cohesion: 0.18
Nodes (15): get(), cargar(), colorDeDificultad(), DifficultyResponse, useDificultad(), SectionData(), MySquadView(), ResumenJornada() (+7 more)

### Community 18 - "read.ts"
Cohesion: 0.10
Nodes (27): LeagueSnapshot, apiActivityEntrySchema, apiActivitySchema, apiCalendarSchema, apiLeagueSchema, apiLeaguesSchema, apiLeagueTeamSchema, apiLeagueTeamsSchema (+19 more)

### Community 19 - "CSV Squad Import"
Cohesion: 0.22
Nodes (14): countDelimiterOutsideQuotes(), CsvPosition, CsvSquadParseResult, CsvSquadRow, detectDelimiter(), findHeaderIndex(), headerAliases, normalizePlayerName() (+6 more)

### Community 20 - "Bottom Sheet Gestures"
Cohesion: 0.26
Nodes (12): BottomSheet(), alMover(), alSoltar(), debeCerrarse(), desplazamientoDe(), Gesto, MINIMO_PARA_ARRASTRAR, opacidadDeFondo() (+4 more)

### Community 21 - "SquadValueHistory.tsx"
Cohesion: 0.23
Nodes (13): aggregateCurrentSquad(), filterPlayerHistory(), historyDelta(), HistoryRange, SQUAD_HISTORY_START, MiniTrend(), RANGES, Response (+5 more)

### Community 22 - "compilerOptions"
Cohesion: 0.06
Nodes (33): @cloudflare/workers-types, db, dom, dom.iterable, esnext, examples, **/*.mts, .next/dev/types/**/*.ts (+25 more)

### Community 23 - "PlayerDetails.tsx"
Cohesion: 0.22
Nodes (10): tonoDeDificultad(), LigaContext, LigaProvider(), useLeagueId(), cuando(), fecha(), Forma(), HistoryChart() (+2 more)

### Community 24 - "iOS OAuth Plugin"
Cohesion: 0.15
Nodes (12): ASPresentationAnchor, ASWebAuthenticationPresentationContextProviding, ASWebAuthenticationSession, AuthenticationServices, Capacitor, CAPBridgedPlugin, CAPPlugin, CAPPluginCall (+4 more)

### Community 25 - "LaLiga Connector"
Cohesion: 0.14
Nodes (8): LaligaConnectionCard(), LaligaConnectionModal(), connectorState, getLaligaConnectorState(), LaligaConnectorState, LaligaConnectorStatus, LaligaLeagueSummary, LaligaReadOnlyProvider

### Community 26 - "Calendar & Odds View"
Cohesion: 0.21
Nodes (9): agruparPorDia(), CalendarResponse, CalendarView(), Equipo, hora(), Partido(), SemanaCargada(), Cuotas (+1 more)

### Community 27 - "MarketView.tsx"
Cohesion: 0.18
Nodes (10): horasParaCierre(), MarketView(), act(), Orden, ORDENES, PositionFilter, pujas(), SourceFilter (+2 more)

### Community 28 - "Supabase Database Types"
Cohesion: 0.17
Nodes (11): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+3 more)

### Community 29 - "Fantasy"
Cohesion: 0.06
Nodes (30): 0. Lo primero que hay que decidir (bloqueante, no técnico), A. Qué existe ya (reutilizable), Auditoría técnica — Fase 1 (rediseño: Liga / Alertas / Economía / Mercado / Exportar), B. Datos disponibles, C. Viabilidad del saldo, CORRECCIÓN (2026-08-13, contra una liga real de 8 managers), D. Riesgos, E. Plan de implementación (una vez resuelto §0) (+22 more)

### Community 30 - "millions"
Cohesion: 0.17
Nodes (10): AlertsView(), buyout(), CompareView(), Histories, trend(), millions(), LeagueView(), Clausula() (+2 more)

### Community 31 - "catalog-enrich.ts"
Cohesion: 0.32
Nodes (6): DatosDeCatalogo, enriquecerJugador(), enriquecerJugadores(), Enriquecible, catalogo, Jugador

### Community 32 - "Onboarding & Demo Modals"
Cohesion: 0.22
Nodes (9): AddMarketModal(), AddSquadModal(), Dashboard(), DemoPlayerRow(), formatMoney(), MarketView(), Onboarding(), parseEuropeanNumber() (+1 more)

### Community 33 - "Weekly Points Data"
Cohesion: 0.46
Nodes (6): JornadaPuntos, leerJornada(), leerJornadas(), numero(), puntosDeJornada(), ultimasJornadas()

### Community 34 - "completarCajas"
Cohesion: 0.36
Nodes (5): completarCajas(), getLeagueTeam(), ConCaja, equiposSinCaja(), mezclarCajas()

### Community 36 - "Team"
Cohesion: 0.28
Nodes (5): Team, ApiMatchLike, mapCalendar(), Match, EQUIPOS

### Community 37 - "writes.ts"
Cohesion: 0.14
Nodes (19): base64url(), dynamic, POST(), runtime, delay(), fetchAndParse(), FetchOptions, publicFetch() (+11 more)

### Community 41 - "fantasy.ts"
Cohesion: 0.18
Nodes (13): ComparisonPlayer, mergeComparisonPlayers(), base, LeagueTeam, PlayerStatus, POSITIONS, SquadPlayer, Propiedad (+5 more)

### Community 42 - "activity.ts"
Cohesion: 0.17
Nodes (10): ActivityPageReport, collectActivityPages(), ACTIVITY_TYPE, ActivityEntry, BuildInput, EUROS_POR_PUNTO, LedgerEntry, ManagerEconomy (+2 more)

### Community 43 - "bid/route.ts"
Cohesion: 0.23
Nodes (13): Body, dynamic, locked(), POST(), dynamic, GET(), construirIndice(), getLeagueMarket() (+5 more)

### Community 44 - "Traspaso: estado real del proyecto y qué falta"
Cohesion: 0.13
Nodes (14): Alertas de cláusula — `src/server/laliga/alerts/`, Conector de solo lectura — `src/server/laliga/`, Cómo arrancarlo, Decisión pendiente, y es del usuario, Defecto real encontrado y corregido con esto, Economía — `src/server/laliga/economy/`, Exportación CSV — `src/server/laliga/exports/`, Lo más importante que hay que saber (+6 more)

### Community 45 - "Dirección visual (obligatoria)"
Cohesion: 0.15
Nodes (12): Accesibilidad, Antes de publicar, Caja y valor de plantilla, Cristal líquido, Datos que el encargo pide y aún hay que confirmar, Dirección visual (obligatoria), Navegación, Por pantalla (+4 more)

### Community 46 - "football-data.ts"
Cohesion: 0.28
Nodes (11): ALIAS, cuotasDeFila(), CuotasDePartido, equipoDe(), fechaIso(), FilaCsv, interpretar(), leerCsv() (+3 more)

### Community 49 - "difficulty/route.ts"
Cohesion: 0.30
Nodes (10): dynamic, GET(), maxDuration, dynamic, GET(), maxDuration, seasonFetch(), getCalendar() (+2 more)

### Community 50 - "getLeagueSnapshot"
Cohesion: 0.36
Nodes (10): dynamic, GET(), maxDuration, buildDashboard(), buildEconomy(), SALDO_INICIAL, completarJugadores(), getLeagueActivity() (+2 more)

### Community 51 - "buyout/route.ts"
Cohesion: 0.27
Nodes (9): Body, dynamic, locked(), maxDuration, POST(), GET(), isClauseShielded(), propiedadDe() (+1 more)

### Community 52 - "laliga/teams.ts"
Cohesion: 0.33
Nodes (6): FALLBACK_TEAMS, emparejar(), normalizar(), RUIDO, EQUIPOS, id()

### Community 53 - "value-history/route.ts"
Cohesion: 0.28
Nodes (7): dynamic, GET(), worker(), maxDuration, dynamic, GET(), getMarketValueHistory()

### Community 54 - "Arquitectura"
Cohesion: 0.22
Nodes (8): Arquitectura, Componentes, Decisiones del MVP, Flujo activo, Límite futuro del proveedor, Principio, Riesgo principal, V2

### Community 55 - "Integración LALIGA Fantasy en modo lectura"
Cohesion: 0.22
Nodes (8): Arquitectura activa, Criterios de aceptación del MVP actual, Decisión de producto, Estado de la decisión, Evidencia de Fase 0, Integración LALIGA Fantasy en modo lectura, Puerta para reconsiderar la integración, V2 y piloto automático

### Community 56 - "Prompt maestro para Lovable"
Cohesion: 0.22
Nodes (8): Calidad, Decisión obligatoria sobre LALIGA Fantasy, Diseño, Fuente de verdad, MVP que debe preservarse, Prioridad del bloque, Prompt maestro para Lovable, Resultado esperado

### Community 57 - "lineup.ts"
Cohesion: 0.36
Nodes (7): Position, bestEleven(), ConProbabilidad, FORMATIONS, lineupRank(), jugador(), plantilla()

### Community 58 - "Modelo de datos"
Cohesion: 0.29
Nodes (6): Ingesta desacoplada, Modelo de datos, Núcleo, Onboarding e importación, Plantillas sin catálogo, Seguridad verificada

### Community 59 - "LigaLab en iPhone — login social de LALIGA"
Cohesion: 0.29
Nodes (6): Archivos, Flujo, LigaLab en iPhone — login social de LALIGA, Objetivo, Publicación, Seguridad

### Community 60 - "2026-07-26 — `support_manual_squad_import`"
Cohesion: 0.33
Nodes (5): 2026-07-26 — `support_manual_squad_import`, Cambio aplicado, Motivo, Registro de cambios de base de datos, Verificación

### Community 61 - "Acceso con cuentas sociales de LALIGA Fantasy"
Cohesion: 0.40
Nodes (4): Acceso con cuentas sociales de LALIGA Fantasy, Estado, Por qué no hay OAuth social de LALIGA en un clic en una web, Seguridad

## Knowledge Gaps
- **350 isolated node(s):** `dynamic`, `dynamic`, `dynamic`, `runtime`, `OAuthState` (+345 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MarketValuePoint` connect `SquadValueHistory.tsx` to `clause-alerts.ts`, `fantasy.ts`, `FantasyApp.tsx`, `Data Mappers`, `read.ts`, `PlayerDetails.tsx`, `millions`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `Player` connect `FantasyApp.tsx` to `clause-alerts.ts`, `lineups.ts`, `LeagueView.tsx`, `fantasy.ts`, `AlertsView.tsx`, `Data Mappers`, `get`, `SquadValueHistory.tsx`, `PlayerDetails.tsx`, `MarketView.tsx`, `millions`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `DiagnosticoDeSesion` connect `session.ts` to `FantasyApp.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `dynamic`, `dynamic`, `dynamic` to the rest of the system?**
  _350 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `errorJson` be split into smaller, more focused modules?**
  _Cohesion score 0.14564564564564564 - nodes in this community are weakly interconnected._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05221017514595496 - nodes in this community are weakly interconnected._
- **Should `clause-alerts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._