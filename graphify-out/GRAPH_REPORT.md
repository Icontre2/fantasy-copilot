# Graph Report - fantasy-copilot  (2026-08-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 968 nodes · 2254 edges · 42 communities (37 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6cc3d364`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 39
- Community 40
- Community 47
- Community 48

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
- `GET()` --calls--> `buildDashboard()`  [EXTRACTED]
  app/api/fantasy/leagues/[leagueId]/dashboard/route.ts → src/server/laliga/dashboard.ts

## Import Cycles
- None detected.

## Communities (42 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (85): base64url(), dynamic, POST(), runtime, POST(), dynamic, GET(), maxDuration (+77 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (63): dynamic, POST(), dynamic, POST(), clearOAuthCookie(), decodeState(), dynamic, OAuthState (+55 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (28): MarketValuePoint, ClauseAlertsReport, mapWithConcurrency(), MAX_HISTORY_REQUESTS, PREFILTER_VALUE_RATIO, AlertLevel, buildAlert(), buildClauseAlerts() (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (39): LeagueTeam, Position, fetchTeam(), getProbableLineups(), getProbableTeam(), headers, mapConcurrent(), ProbableTeam (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (43): dynamic, GET(), dynamic, GET(), dynamic, GET(), RFC-7636, atributos() (+35 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (25): ALIAS, cuotasDeFila(), CuotasDePartido, equipoDe(), fechaIso(), FilaCsv, getCuotas(), interpretar() (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (36): cheerio, drizzle-orm, lucide-react, next, dependencies, cheerio, drizzle-orm, lucide-react (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (18): AuthMode, AuthPanel(), Club, demoMarket, demoPlayers, emptyLiveData, LiveData, MarketEntry (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (16): ExportView(), BottomNav(), DataSection, ENDPOINT, LOADING_LABEL, NAV_ICONS, LeagueView(), RivalLineup (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (24): dynamic, GET(), dynamic, GET(), RFC-4180, MarketEntry, csvResponse(), computeDailyTrend() (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (22): AlertCard(), AlertsView(), buyout(), blindaje(), Filter, FILTERS, LEVEL_STYLE, motivoSinTendencia() (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (18): chartCoordinates(), currentPoint(), DashboardView(), filterHistory(), historyCache, isPortfolioPoint(), localDate(), MiniChart() (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (13): LoginView(), NOMBRES_PROVEEDOR, AlertsResponse, LeaguesResponse, ScheduleStatus, SyncResponse, ErrorBox(), Proveedor (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (18): del(), get(), post(), request(), FantasyApp(), logout(), SectionData(), OnceDelRival() (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (18): privateFetch(), mapLeagueTeam(), mapManager(), mapSquadPlayer(), mapStandingRow(), completarCajas(), getCurrentWeek(), getLeagueStanding() (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (33): @cloudflare/vite-plugin, drizzle-kit, eslint, eslint-config-next, devDependencies, @cloudflare/vite-plugin, drizzle-kit, eslint (+25 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (18): mapLeague(), mapMarketEntry(), mapMarketValueHistory(), mapPlayerMaster(), POSITION_BY_ID, POSITION_ORDER, toPosition(), resolveTeamId() (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (23): cargar(), colorDeDificultad(), DifficultyResponse, tonoDeDificultad(), useDificultad(), LineupsResponse, LineupsView(), MySquadView() (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (19): apiActivityEntrySchema, apiActivitySchema, apiLeagueSchema, apiLeagueTeamSchema, apiManagerSchema, apiMarketItemSchema, apiMarketSchema, apiMarketValuePointSchema (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (14): countDelimiterOutsideQuotes(), CsvPosition, CsvSquadParseResult, CsvSquadRow, detectDelimiter(), findHeaderIndex(), headerAliases, normalizePlayerName() (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.26
Nodes (12): BottomSheet(), alMover(), alSoltar(), debeCerrarse(), desplazamientoDe(), Gesto, MINIMO_PARA_ARRASTRAR, opacidadDeFondo() (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (12): aggregateCurrentSquad(), filterPlayerHistory(), historyDelta(), HistoryRange, SQUAD_HISTORY_START, MiniTrend(), RANGES, Response (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (34): @cloudflare/workers-types, @cloudflare/workers-types, db, dom, dom.iterable, esnext, examples, **/*.mts (+26 more)

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (5): LigaContext, LigaProvider(), useLeagueId(), Clausula(), pagar()

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (12): ASPresentationAnchor, ASWebAuthenticationPresentationContextProviding, ASWebAuthenticationSession, AuthenticationServices, Capacitor, CAPBridgedPlugin, CAPPlugin, CAPPluginCall (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (8): LaligaConnectionCard(), LaligaConnectionModal(), connectorState, getLaligaConnectorState(), LaligaConnectorState, LaligaConnectorStatus, LaligaLeagueSummary, LaligaReadOnlyProvider

### Community 26 - "Community 26"
Cohesion: 0.21
Nodes (9): agruparPorDia(), CalendarResponse, CalendarView(), Equipo, hora(), Partido(), SemanaCargada(), Cuotas (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (9): horasParaCierre(), MarketView(), act(), Orden, ORDENES, PositionFilter, pujas(), SourceFilter (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.17
Nodes (11): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (11): dynamic, expiryFromAbsolute(), expiryFromJwt(), expiryFromTtl(), looksLikeToken(), numericValue(), parseImportedToken(), runtime (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (10): ComparisonPlayer, mergeComparisonPlayers(), base, CompareView(), Histories, trend(), PlayerImage(), TeamsResponse (+2 more)

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (8): construirIndice(), DatosDeCatalogo, enriquecerJugador(), enriquecerJugadores(), Enriquecible, catalogo, Jugador, completarJugadores()

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (9): AddMarketModal(), AddSquadModal(), Dashboard(), DemoPlayerRow(), formatMoney(), MarketView(), Onboarding(), parseEuropeanNumber() (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.46
Nodes (6): JornadaPuntos, leerJornada(), leerJornadas(), numero(), puntosDeJornada(), ultimasJornadas()

### Community 34 - "Community 34"
Cohesion: 0.47
Nodes (3): ConCaja, equiposSinCaja(), mezclarCajas()

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (10): League, PlayerStatus, POSITIONS, StandingRow, Team, ApiMatchLike, mapCalendar(), Match (+2 more)

## Knowledge Gaps
- **265 isolated node(s):** `Body`, `Body`, `FetchOptions`, `LaligaErrorKind`, `Method` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MarketValuePoint` connect `Community 2` to `Community 36`, `Community 12`, `Community 14`, `Community 16`, `Community 17`, `Community 21`, `Community 30`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Player` connect `Community 30` to `Community 2`, `Community 3`, `Community 36`, `Community 8`, `Community 10`, `Community 12`, `Community 16`, `Community 17`, `Community 21`, `Community 27`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Manager` connect `Community 13` to `Community 36`, `Community 8`, `Community 12`, `Community 14`, `Community 16`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `Body`, `Body`, `FetchOptions` to the rest of the system?**
  _265 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.051138294257560314 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07140538786108407 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09365079365079365 - nodes in this community are weakly interconnected._