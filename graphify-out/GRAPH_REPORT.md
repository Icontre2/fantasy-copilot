# Graph Report - fantasy-copilot  (2026-08-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 968 nodes · 2254 edges · 42 communities (37 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.62)
- Token cost: 35,759 input · 4,408 output

## Graph Freshness
- Built from commit: `6cc3d364`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Session API Helpers
- OAuth Login Flow
- Clause Alerts Builder
- Probable Lineups
- Social OAuth Callback
- Football Odds Data
- Package Dependencies
- App Shell & Demo Data
- App Navigation Shell
- CSV Export API
- Alerts View UI
- Dashboard View
- Login View UI
- API Client & Mobile Auth
- League Data Reader
- Dev Dependencies
- Data Mappers
- Lineup Difficulty View
- API Zod Schemas
- CSV Squad Import
- Bottom Sheet Gestures
- Squad Value History
- TypeScript Config
- League Context Provider
- iOS OAuth Plugin
- LaLiga Connector
- Calendar & Odds View
- Market View UI
- Supabase Database Types
- Token Import Parsing
- Player Comparison
- Player Catalog Enrichment
- Onboarding & Demo Modals
- Weekly Points Data
- Team Money Calculations
- Root Layout
- Fantasy Domain Types
- ESLint Config
- Next.js Config
- PostCSS Config
- Vercel Config

## God Nodes (most connected - your core abstractions)
1. `errorJson()` - 48 edges
2. `privateJson()` - 48 edges
3. `requireSession()` - 39 edges
4. `millions()` - 27 edges
5. `getLeagueSnapshot()` - 24 edges
6. `get()` - 20 edges
7. `compilerOptions` - 18 edges
8. `getMyProfile()` - 17 edges
9. `Player` - 16 edges
10. `getPlayerCatalog()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `privateJsonWithCookies()`  [EXTRACTED]
  app/api/fantasy/auth/token/route.ts → src/server/http/responses.ts
- `POST()` --calls--> `buildSessionCookies()`  [EXTRACTED]
  app/api/fantasy/auth/token/route.ts → src/server/laliga/session-cookie.ts
- `POST()` --calls--> `createSession()`  [EXTRACTED]
  app/api/fantasy/auth/token/route.ts → src/server/laliga/session.ts
- `GET()` --calls--> `getCuotas()`  [EXTRACTED]
  app/api/fantasy/calendar/route.ts → src/server/odds/football-data.ts
- `GET()` --calls--> `getCuotas()`  [EXTRACTED]
  app/api/fantasy/difficulty/route.ts → src/server/odds/football-data.ts

## Import Cycles
- None detected.

## Communities (42 total, 5 thin omitted)

### Community 0 - "Session API Helpers"
Cohesion: 0.05
Nodes (85): base64url(), dynamic, POST(), runtime, POST(), dynamic, GET(), maxDuration (+77 more)

### Community 1 - "OAuth Login Flow"
Cohesion: 0.07
Nodes (63): dynamic, POST(), dynamic, POST(), clearOAuthCookie(), decodeState(), dynamic, OAuthState (+55 more)

### Community 2 - "Clause Alerts Builder"
Cohesion: 0.09
Nodes (28): MarketValuePoint, ClauseAlertsReport, mapWithConcurrency(), MAX_HISTORY_REQUESTS, PREFILTER_VALUE_RATIO, AlertLevel, buildAlert(), buildClauseAlerts() (+20 more)

### Community 3 - "Probable Lineups"
Cohesion: 0.07
Nodes (39): LeagueTeam, Position, fetchTeam(), getProbableLineups(), getProbableTeam(), headers, mapConcurrent(), ProbableTeam (+31 more)

### Community 4 - "Social OAuth Callback"
Cohesion: 0.09
Nodes (43): dynamic, GET(), dynamic, GET(), dynamic, GET(), RFC-7636, atributos() (+35 more)

### Community 5 - "Football Odds Data"
Cohesion: 0.12
Nodes (25): ALIAS, cuotasDeFila(), CuotasDePartido, equipoDe(), fechaIso(), FilaCsv, getCuotas(), interpretar() (+17 more)

### Community 6 - "Package Dependencies"
Cohesion: 0.05
Nodes (36): cheerio, drizzle-orm, lucide-react, next, dependencies, cheerio, drizzle-orm, lucide-react (+28 more)

### Community 7 - "App Shell & Demo Data"
Cohesion: 0.07
Nodes (18): AuthMode, AuthPanel(), Club, demoMarket, demoPlayers, emptyLiveData, LiveData, MarketEntry (+10 more)

### Community 8 - "App Navigation Shell"
Cohesion: 0.13
Nodes (16): ExportView(), BottomNav(), DataSection, ENDPOINT, LOADING_LABEL, NAV_ICONS, LeagueView(), RivalLineup (+8 more)

### Community 9 - "CSV Export API"
Cohesion: 0.14
Nodes (24): dynamic, GET(), dynamic, GET(), RFC-4180, MarketEntry, csvResponse(), computeDailyTrend() (+16 more)

### Community 10 - "Alerts View UI"
Cohesion: 0.13
Nodes (22): AlertCard(), AlertsView(), buyout(), blindaje(), Filter, FILTERS, LEVEL_STYLE, motivoSinTendencia() (+14 more)

### Community 11 - "Dashboard View"
Cohesion: 0.12
Nodes (18): chartCoordinates(), currentPoint(), DashboardView(), filterHistory(), historyCache, isPortfolioPoint(), localDate(), MiniChart() (+10 more)

### Community 12 - "Login View UI"
Cohesion: 0.11
Nodes (13): LoginView(), NOMBRES_PROVEEDOR, AlertsResponse, LeaguesResponse, ScheduleStatus, SyncResponse, ErrorBox(), Proveedor (+5 more)

### Community 13 - "API Client & Mobile Auth"
Cohesion: 0.15
Nodes (18): del(), get(), post(), request(), FantasyApp(), logout(), SectionData(), OnceDelRival() (+10 more)

### Community 14 - "League Data Reader"
Cohesion: 0.16
Nodes (18): privateFetch(), mapLeagueTeam(), mapManager(), mapSquadPlayer(), mapStandingRow(), completarCajas(), getCurrentWeek(), getLeagueStanding() (+10 more)

### Community 15 - "Dev Dependencies"
Cohesion: 0.06
Nodes (33): @cloudflare/vite-plugin, drizzle-kit, eslint, eslint-config-next, devDependencies, @cloudflare/vite-plugin, drizzle-kit, eslint (+25 more)

### Community 16 - "Data Mappers"
Cohesion: 0.13
Nodes (18): mapLeague(), mapMarketEntry(), mapMarketValueHistory(), mapPlayerMaster(), POSITION_BY_ID, POSITION_ORDER, toPosition(), resolveTeamId() (+10 more)

### Community 17 - "Lineup Difficulty View"
Cohesion: 0.11
Nodes (23): cargar(), colorDeDificultad(), DifficultyResponse, tonoDeDificultad(), useDificultad(), LineupsResponse, LineupsView(), MySquadView() (+15 more)

### Community 18 - "API Zod Schemas"
Cohesion: 0.10
Nodes (19): apiActivityEntrySchema, apiActivitySchema, apiLeagueSchema, apiLeagueTeamSchema, apiManagerSchema, apiMarketItemSchema, apiMarketSchema, apiMarketValuePointSchema (+11 more)

### Community 19 - "CSV Squad Import"
Cohesion: 0.22
Nodes (14): countDelimiterOutsideQuotes(), CsvPosition, CsvSquadParseResult, CsvSquadRow, detectDelimiter(), findHeaderIndex(), headerAliases, normalizePlayerName() (+6 more)

### Community 20 - "Bottom Sheet Gestures"
Cohesion: 0.26
Nodes (12): BottomSheet(), alMover(), alSoltar(), debeCerrarse(), desplazamientoDe(), Gesto, MINIMO_PARA_ARRASTRAR, opacidadDeFondo() (+4 more)

### Community 21 - "Squad Value History"
Cohesion: 0.24
Nodes (12): aggregateCurrentSquad(), filterPlayerHistory(), historyDelta(), HistoryRange, SQUAD_HISTORY_START, MiniTrend(), RANGES, Response (+4 more)

### Community 22 - "TypeScript Config"
Cohesion: 0.06
Nodes (34): @cloudflare/workers-types, @cloudflare/workers-types, db, dom, dom.iterable, esnext, examples, **/*.mts (+26 more)

### Community 23 - "League Context Provider"
Cohesion: 0.33
Nodes (5): LigaContext, LigaProvider(), useLeagueId(), Clausula(), pagar()

### Community 24 - "iOS OAuth Plugin"
Cohesion: 0.15
Nodes (12): ASPresentationAnchor, ASWebAuthenticationPresentationContextProviding, ASWebAuthenticationSession, AuthenticationServices, Capacitor, CAPBridgedPlugin, CAPPlugin, CAPPluginCall (+4 more)

### Community 25 - "LaLiga Connector"
Cohesion: 0.14
Nodes (8): LaligaConnectionCard(), LaligaConnectionModal(), connectorState, getLaligaConnectorState(), LaligaConnectorState, LaligaConnectorStatus, LaligaLeagueSummary, LaligaReadOnlyProvider

### Community 26 - "Calendar & Odds View"
Cohesion: 0.21
Nodes (9): agruparPorDia(), CalendarResponse, CalendarView(), Equipo, hora(), Partido(), SemanaCargada(), Cuotas (+1 more)

### Community 27 - "Market View UI"
Cohesion: 0.20
Nodes (9): horasParaCierre(), MarketView(), act(), Orden, ORDENES, PositionFilter, pujas(), SourceFilter (+1 more)

### Community 28 - "Supabase Database Types"
Cohesion: 0.17
Nodes (11): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+3 more)

### Community 29 - "Token Import Parsing"
Cohesion: 0.33
Nodes (11): dynamic, expiryFromAbsolute(), expiryFromJwt(), expiryFromTtl(), looksLikeToken(), numericValue(), parseImportedToken(), runtime (+3 more)

### Community 30 - "Player Comparison"
Cohesion: 0.18
Nodes (10): ComparisonPlayer, mergeComparisonPlayers(), base, CompareView(), Histories, trend(), PlayerImage(), TeamsResponse (+2 more)

### Community 31 - "Player Catalog Enrichment"
Cohesion: 0.29
Nodes (8): construirIndice(), DatosDeCatalogo, enriquecerJugador(), enriquecerJugadores(), Enriquecible, catalogo, Jugador, completarJugadores()

### Community 32 - "Onboarding & Demo Modals"
Cohesion: 0.22
Nodes (9): AddMarketModal(), AddSquadModal(), Dashboard(), DemoPlayerRow(), formatMoney(), MarketView(), Onboarding(), parseEuropeanNumber() (+1 more)

### Community 33 - "Weekly Points Data"
Cohesion: 0.46
Nodes (6): JornadaPuntos, leerJornada(), leerJornadas(), numero(), puntosDeJornada(), ultimasJornadas()

### Community 34 - "Team Money Calculations"
Cohesion: 0.47
Nodes (3): ConCaja, equiposSinCaja(), mezclarCajas()

### Community 36 - "Fantasy Domain Types"
Cohesion: 0.15
Nodes (10): League, PlayerStatus, POSITIONS, StandingRow, Team, ApiMatchLike, mapCalendar(), Match (+2 more)

## Knowledge Gaps
- **265 isolated node(s):** `Body`, `Body`, `FetchOptions`, `LaligaErrorKind`, `Method` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MarketValuePoint` connect `Clause Alerts Builder` to `Fantasy Domain Types`, `Login View UI`, `League Data Reader`, `Data Mappers`, `Lineup Difficulty View`, `Squad Value History`, `Player Comparison`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Player` connect `Player Comparison` to `Clause Alerts Builder`, `Probable Lineups`, `Fantasy Domain Types`, `App Navigation Shell`, `Alerts View UI`, `Login View UI`, `Data Mappers`, `Lineup Difficulty View`, `Squad Value History`, `Market View UI`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Manager` connect `API Client & Mobile Auth` to `Fantasy Domain Types`, `App Navigation Shell`, `Login View UI`, `League Data Reader`, `Data Mappers`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `Body`, `Body`, `FetchOptions` to the rest of the system?**
  _265 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Session API Helpers` be split into smaller, more focused modules?**
  _Cohesion score 0.051138294257560314 - nodes in this community are weakly interconnected._
- **Should `OAuth Login Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.07140538786108407 - nodes in this community are weakly interconnected._
- **Should `Clause Alerts Builder` be split into smaller, more focused modules?**
  _Cohesion score 0.09365079365079365 - nodes in this community are weakly interconnected._