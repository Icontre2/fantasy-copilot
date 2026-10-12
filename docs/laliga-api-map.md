# Mapa de la API de LALIGA Fantasy (caja negra)

Observado el 2026-10-12 (temporada 26/27, jornada 8 en curso). Solo peticiones
GET, sin descompilar nada: las condiciones de uso prohíben expresamente la
"modificación, alteración o descompilación" del juego. Todo lo que hay aquí sale
de respuestas HTTP reales o del propio conector (`src/server/laliga/`).

## Hosts

| Host | Estado | Uso |
| --- | --- | --- |
| `fantasy-api.llt-services.com` | **Vivo** | Todo: público (sin token) y privado (Bearer). |
| `api-fantasy.llt-services.com` | **Muerto** — 502 de Azure Application Gateway en cualquier ruta | Host de temporadas anteriores (`/api/v3`, `/api/v5`). `LALIGA_PUBLIC_BASE_URL` todavía apunta aquí (sin uso real). |
| `login.laliga.es` (Azure AD B2C `laligadspprob2c`) | Vivo | Login ROPC (`B2C_1A_ResourceOwnerv2`) y refresco. |
| `assets-fantasy.llt-services.com` | Vivo | Imágenes: `players/t{teamId}/p{id}/256x256/...png`. |
| `fantasy.laliga.com` | Landing | Solo marketing; su bundle JS no contiene la API de juego (solo `/api/v2/guests` y `/dsp/v3/token`). |

Convenciones comunes: prefijo `/api/v1/competition/{c}` con `c = 1` (LALIGA
Fantasy oficial), parámetro y cabecera `x-lang=es`, y un `User-Agent` explícito.
Errores: 401 sin token en rutas privadas, 404 con cuerpo de 34 bytes en rutas
inexistentes, 500 en prefijos de versión antiguos (`/api/v3/...`).

## Endpoints públicos (sin token) — verificados

### `GET /api/v1/competition/1/week/current`
```json
{ "isLive": true, "weekNumber": 8, "previousWeek": 7, "nextWeek": 9,
  "openingWeekDate": "2026-10-09T21:00:00+02:00",
  "closingWeekDate": "2026-10-13T03:00:00+02:00" }
```

### `GET /api/v1/competition/1/players` (~340 KB)
Catálogo completo: 854 entradas, 20 equipos.
`{ id, positionId, nickname, lastSeasonPoints, playerStatus, marketValue, points, averagePoints, weekPoints[{weekNumber, points}], image, teamId }`

- **Ojo:** aquí `id`, `positionId`, `teamId`, `marketValue` y `lastSeasonPoints` llegan como **string**; en el detalle del jugador son números.
- `positionId`: 1 portero (89), 2 defensa (289), 3 centrocampista (262), 4 delantero (189), 5 entrenador (25).
- `playerStatus`: `ok`, `injured`, `doubtful`, `suspended`, `out_of_league` (270: jugadores que ya no están en la liga siguen en el catálogo).
- `weekPoints` no viene ordenado por jornada.

### `GET /api/v1/competition/1/player/{id}`
Detalle: `id, name, nickname, slug, teamId, positionId, position, marketValue, points, averagePoints, lastSeasonPoints, playerStatus, images.transparent["256x256"]`, más `playerStats[]` por jornada:
`{ weekNumber, totalPoints, isInIdealFormation, stats: { métrica: [valor, puntos] } }`.

Métricas (21): `mins_played, goals, goal_assist, offtarget_att_assist, pen_area_entries, penalty_won, penalty_save, saves, effective_clearance, penalty_failed, own_goals, goals_conceded, yellow_card, second_yellow_card, red_card, total_scoring_att, won_contest, ball_recovery, poss_lost_all, penalty_conceded, marca_points`.
Cada par es `[valor bruto, puntos que aporta]`: el desglose completo de la puntuación.

### `GET /api/v1/competition/1/player/{id}/market-value`
Serie diaria desde el inicio de temporada (106 puntos para el id 2443: del 2026-06-29 al 2026-10-12).
`[{ lfpId, marketValue, date, bids }]`, donde `lfpId = 16_000_000 + id`.

### `GET /api/v1/competition/1/calendar?weekNumber={n}`
`[{ id, matchDate, date, time, localId, visitorId, matchState, localScore, visitorScore, featured }]`.

## Endpoints privados (Bearer) — los que usa el conector

| Ruta | Para qué |
| --- | --- |
| `GET /api/v4/user/me` | Manager autenticado. |
| `GET /api/v3/user` | Validación del login (ver `auth.ts`). |
| `GET {c}/leagues` | Ligas del usuario. |
| `GET {c}/leagues/{leagueId}/standing` | Clasificación. |
| `GET {c}/leagues/{leagueId}/teams` | Equipos de la liga. |
| `GET {c}/leagues/{leagueId}/teams/{teamId}` | Plantilla, cláusulas, `teamMoney`. |
| `GET {c}/leagues/{leagueId}/activity/{page}` | Actividad paginada (fichajes, cláusulas). |
| `GET {c}/league/{leagueId}/market` | Mercado (`league` en singular, a diferencia del resto). |

Escrituras que existen en `writes.ts` (fuera del alcance de solo lectura del README):
`{c}/league/{leagueId}/market/{marketId}` y `{c}/league/{leagueId}/buyout/{playerId}/pay`.

## Qué usa la app de todo esto

| Endpoint | Dónde se ve |
| --- | --- |
| `player/{id}` | Ficha de jugador → «De dónde salen sus puntos»: desglose por métrica y jornada, once ideal, valoración de Marca, reparto por tipo de acción (cálculo nuestro). Ruta `/api/fantasy/players/{id}/breakdown`. |
| `players` | Lo anterior + puntos por millón y puesto dentro de su posición (cálculo nuestro). |
| `player/{id}/market-value` | Ficha → variación en 7 y 30 días sobre la curva existente. |
| `calendar` | Ficha → «Sus próximos partidos» (jornada en curso + 4). Ruta `/api/fantasy/teams/{teamId}/fixtures`. El calendario se guarda 10 min en memoria. |

`bids` del histórico no se usa: en todas las respuestas observadas vale 0.

## Hallazgos y estado

1. ~~`LALIGA_PUBLIC_BASE_URL` apunta a un host muerto~~ — **resuelto**: se ha borrado junto con `publicFetch`, que no se usaba.
2. Tipos inconsistentes entre `/players` (strings) y `/player/{id}` (números): ya los absorbe `numeric` en `schemas.ts`. Ahora lo cubren tests de contrato con respuestas reales (`src/server/laliga/fixtures/`, `contract.test.ts`).
3. `docs/laliga-readonly-integration.md` sigue desactualizado (dice que no se invoca la API privada). Se deja como registro de la decisión original.
4. Riesgo legal: las condiciones limitan el uso a «personal y privado» y exigen consentimiento escrito para fines comerciales.

## Lo que queda sin mapear

No se han enumerado rutas a ciegas. Para completar el mapa de forma legítima,
lo correcto es observar el tráfico de **tu propia** sesión (proxy HTTPS o
DevTools de la PWA) mientras usas la app, en lugar de adivinar rutas contra el
servidor ni descompilar el APK.
