# Auditoría técnica — Fase 1 (rediseño: Liga / Alertas / Economía / Mercado / Exportar)

Fecha: 2026-08-13.

Encargo: rehacer Fantasy Copilot usando como base técnica
[`JavierContreras00/AppFantasy`](https://github.com/JavierContreras00/AppFantasy), aparcando
Autopilot/Copilot/recomendaciones, y centrando el producto en datos reales, alertas de
cláusula, exportación CSV y contabilidad de manager. Este documento es el entregable de la
"Primera fase" pedida: auditoría antes de tocar código de producto.

Metodología: lectura directa del código de `AppFantasy` (commit `65e813b`, 2026-08-07) y de
este repositorio (`fantasy-copilot`, rama `claude/fantasy-app-audit-3nysmu`). No se ha
ejecutado la app contra una cuenta real de LALIGA en esta sesión: todo lo que sigue viene de
código, tests, schemas y de la documentación ya auditada dentro de `AppFantasy`
(`engine/DATA.md`, `docs/MARKET_DATA_AUDIT.md`, `docs/PRODUCT_AUDIT.md`, `docs/REMOVED_FEATURES.md`),
que a su vez documenta pruebas reales contra la API hechas en ese repositorio.

---

## 0. Lo primero que hay que decidir (bloqueante, no técnico)

`fantasy-copilot` (este repo) tiene una decisión de producto ya tomada y documentada en
`docs/laliga-readonly-integration.md`:

> **Bloqueada hasta obtener autorización escrita de LALIGA.** [...] Fantasy Copilot no pedirá
> credenciales, no ejecutará ROPC y no llamará a endpoints privados mientras no se resuelva
> este bloqueo.

`AppFantasy`, la base técnica que se pide usar ahora, hace exactamente lo que ese documento
descarta: pide email+contraseña del usuario, ejecuta ROPC contra Azure B2C de LALIGA
(`login.laliga.es`) y llama a endpoints privados no documentados
(`fantasy-api.llt-services.com`) con el token resultante. Lo hace con cuidado (tokens
cifrados en servidor, nunca al cliente, `User-Agent` que se identifica como
`FantasyCopilot/1.0 (+personal-use)`), pero la base legal es la misma que este repo pausó:
las condiciones de LALIGA limitan el uso a ámbito personal/privado y piden consentimiento
escrito para uso comercial; no hay autorización explícita de la API privada para terceros.

Esto no es un detalle técnico: es la puerta de entrada de **todo** lo demás (alertas,
economía, exportación), porque todo depende de leer tu liga real, y eso exige o bien (a)
pedir la contraseña del usuario y hacer ROPC como `AppFantasy`, o bien (b) que el propio
usuario pegue un `access_token` obtenido por su cuenta (sin que la app toque su contraseña).

**No voy a implementar el login por contraseña sin que lo confirmes explícitamente.** Al
final de este documento hay una pregunta concreta sobre esto. El resto de la auditoría asume
que, sea cual sea la vía de auth elegida, la capa de datos por debajo (`schemas.ts`,
`mappers.ts`, `private.ts` de solo lectura) es reutilizable tal cual.

---

## A. Qué existe ya (reutilizable)

### En `AppFantasy` (para portar, no para copiar y pegar sin revisar)

Capa de datos, **de solo lectura**, verificada contra la API real y con tests:

| Fichero | Qué hace | Reutilizar |
| --- | --- | --- |
| `src/server/laliga/config.ts` | URLs base, `COMPETITION_ID`, timeouts, TTLs de caché | Sí, tal cual |
| `src/server/laliga/schemas.ts` | Zod de cada respuesta real de LALIGA (públicas y privadas) | Sí, tal cual — es el contrato más valioso del repo |
| `src/server/laliga/mappers.ts` | Traduce las respuestas de la API a tipos de dominio | Sí, con recorte (quitar `deriveForm`/heurísticas de Copilot que no usaremos) |
| `src/server/laliga/client.ts` | Fetch público con caché/reintentos | Sí |
| `src/server/laliga/private.ts` | Fetch privado (Bearer) + funciones de lectura (`getMyLeagues`, `getLeagueStanding`, `getLeagueTeam`, `getAllLeagueTeams`, `getLeagueMarket`, `getCurrentPlayers`, `getUpcomingFixtures`) | Sí — es exactamente el catálogo de endpoints que pide el punto 8 del encargo |
| `src/server/laliga/auth.ts`, `session.ts`, `token-crypto.ts` | Login ROPC, sesión cifrada en Postgres, refresh | Sí **si** se aprueba la vía de login por contraseña (ver §0) |
| `src/server/laliga/teams.ts` | Mapa de respaldo de los 20 equipos (no hay endpoint público de equipos) | Sí |
| `src/server/storage/database.ts` | Cliente Postgres mínimo + `ensureDatabaseSchema` | Patrón reutilizable; en este repo ya existe Supabase, hay que decidir cuál persiste (ver Riesgos) |
| `src/server/http/session-guard.ts`, `responses.ts` | Guard de sesión y helpers de respuesta JSON | Sí |
| `src/server/laliga/rivals/rival-economy.ts` | Agrega `teamMoney`/`teamValue` ya exactos por rival, sin estimar nada | Reutilizable como referencia de estilo (dato exacto vs calculado), no como funcionalidad (era para pujas, que aparcamos) |
| `src/server/laliga/operations/market-snapshot.ts` | Registro append-only de una foto del mercado, con `winningPrice`/`winningManager` **solo si la API los publica** | Base directa para `economy/transactions.ts` — mismo principio de honestidad de datos que pide el encargo |

Todo lo demás de `AppFantasy` (recommendations.ts, engine/, capital/, optimizer/,
score/, writes.ts, decision-record/decision-evaluator, participation/, futbolfantasy/
scraping) es la capa de Copilot/Autopilot: **no se porta a la nueva app**. Queda en
`AppFantasy` sin tocar, tal y como pide el encargo ("no los borres, desacóplalos").
`writes.ts` en particular (pujar, vender, pagar cláusula, blindar, alineación) no hace
falta para nada de lo pedido — la nueva app es de solo lectura + contabilidad, cero
escritura contra LALIGA.

### En `fantasy-copilot` (este repo, estado actual)

Casi nada de esto existe todavía: hoy es un MVP de importación manual/CSV sobre Supabase,
sin ningún cliente de LALIGA real (`app/laliga-provider.ts` es una interfaz vacía que
siempre devuelve `blocked_by_terms`). Lo que sí es reutilizable de aquí:

- Estructura Next.js + esqueleto de la app (`app/layout.tsx`, `app/page.tsx`, `globals.css`).
- Supabase como base de datos con RLS ya configurado (`app/supabase.ts`,
  `app/database.types.ts`) — candidato natural para las tablas nuevas
  (`fantasy_transactions`, `fantasy_point_income`) en vez de levantar el Postgres propio
  de `AppFantasy`.
- `app/csv-import.ts` no aplica a exportación (es importación manual), pero confirma que
  ya hay convención de CSV en el proyecto.

---

## B. Datos disponibles

Tabla verificada contra `engine/DATA.md`, `docs/MARKET_DATA_AUDIT.md`, `schemas.ts` y
`private.ts` de `AppFantasy` (que documentan pruebas reales contra la API, no solo lectura de
teoría). "Fiabilidad" distingue dato oficial exacto, dato oficial pero con matices, y dato
que no existe en absoluto.

| Dato | Disponible | Endpoint / fuente | Fiabilidad |
| --- | --- | --- | --- |
| Cláusula de rescisión por jugador (`buyoutClause`) | Sí | `GET /api/v1/competition/{c}/leagues/{id}/teams/{teamId}` (privado) | **Oficial, exacto**, solo de jugadores en plantillas (no de mercado) |
| Blindaje (`isShielded`) | Sí | mismo endpoint | Oficial, exacto |
| Saldo/caja actual (`teamMoney`) | Sí, **de todos los managers de la liga**, no solo el tuyo | mismo endpoint | **Oficial, exacto, en vivo** — no es una estimación nuestra |
| Valor de mercado actual | Sí | catálogo (`/players`) y plantillas | Oficial, exacto |
| Histórico diario de valor de mercado | Sí, ~360 puntos/jugador, sin token | `GET /api/v3/player/{id}/market-value` (público) | Oficial, exacto — es la base del cálculo de tendencia para alertas de cláusula |
| Compras/ventas ejecutadas (histórico) | **No** | — | No existe ningún endpoint de histórico de operaciones |
| Precio pagado en una puja ganada (`winningPrice`) | **No**, ni en histórico ni en vivo | — | LALIGA no lo publica en ningún punto observado |
| Comprador de una puja (`winningManager`) | **No** | — | Igual que arriba |
| Precio de compra de un jugador ya en tu plantilla | **No** | — | Confirmado: no aparece en el endpoint de plantilla |
| Fecha de adquisición de un jugador | **No** | — | No hay ningún timestamp de adquisición en la API |
| Número de pujas en curso (`numberOfBids`) | Sí, solo en vivo | `GET /leagues/{id}/market` (privado) | Exacto pero solo instantáneo: el histórico de `bids` en `market-value` **siempre da 0**, no sirve como señal |
| Precio de salida en mercado (`salePrice`) | Sí | `GET /leagues/{id}/market` | Oficial, exacto, en vivo |
| Expiración de la puja/venta | Sí (`expirationDate`) | mismo endpoint | Oficial, cuando la API lo incluye (opcional en el schema) |
| Puntos totales por manager (`teamPoints`, standing) | Sí, acumulado de temporada | `GET /leagues/{id}/standing`, `GET /leagues/{id}/teams/{teamId}` | Oficial, exacto, pero **es un total, no un desglose por jornada** |
| Puntos por jornada de un manager | **No** directamente | — | LALIGA no expone histórico de puntuación por jornada de un equipo; solo se puede derivar como *delta* de `teamPoints` entre dos sincronizaciones nuestras |
| Puntos por jornada de un jugador | No en la API de LALIGA; sí vía scraping de `futbolfantasy.com`, validado 8/8 contra oficiales | `server/futbolfantasy/points.ts` en `AppFantasy` | Fuente externa no oficial, sin contrato — frágil, fuera de alcance de esta fase (no se pide en el encargo) |
| Plantillas de todos los rivales | Sí | `GET /leagues/{id}/teams/{teamId}` para cada `teamId` del standing | Oficial, exacto |
| Mercado completo de la liga | Sí | `GET /leagues/{id}/market` | Oficial, exacto, en vivo |
| Saldo inicial de la liga / reglas económicas | **No** | — | Ningún endpoint expone configuración económica de la liga ni el saldo con el que empezó cada manager |
| Lesiones/sanciones (`playerStatus`) | Sí | catálogo | Oficial, exacto, solo foto actual (sin histórico) |

Campos pedidos en el encargo que **no existen** y por tanto no se inventan en las
exportaciones/alertas: precio de adquisición de jugador, fecha de adquisición,
`current_bid`/`bidder` de una puja ajena (solo se ve la propia, vía `bid` en el item de
mercado), saldo inicial de liga.

---

## C. Viabilidad del saldo

Pregunta directa del encargo: **¿podemos reconstruir el dinero de cada participante, y desde
cuándo?**

**No hace falta reconstruirlo: LALIGA ya publica el saldo actual exacto de todos los
managers de la liga**, no solo el tuyo (`teamMoney` en `GET /leagues/{id}/teams/{teamId}`,
verificado en `AppFantasy` y usado hoy en `rival-economy.ts` precisamente por ser un dato
exacto y no una estimación). Esto cambia el problema respecto a plataformas donde el saldo
rival no es público (el propio `rival-economy.ts` de `AppFantasy` cita expresamente el caso
de Kickbase, donde sí hay que reconstruirlo porque no se publica).

Lo que **no** es reconstruible es el desglose histórico de cómo se llegó a ese saldo:

- No hay endpoint de operaciones pasadas. `winningPrice`/`winningManager` de una subasta
  no se publican en ningún punto observado del código de `AppFantasy`, ni en vivo ni en
  histórico.
- No hay saldo inicial de liga expuesto. Por tanto no se puede calcular
  `saldo_estimado = saldo_inicial + ingresos - gastos + bonus_puntos` desde el origen de la
  liga con datos 100% oficiales.

**Lo que sí se puede construir, y es honesto:**

1. **Saldo actual**: se lee directo de la API (`teamMoney`), no se calcula. Es el dato de
   referencia contra el que se valida cualquier otra cosa.
2. **Ledger prospectivo desde hoy**: a partir del primer día de sincronización, cada vez que
   el job de sync corre puede comparar el snapshot anterior con el nuevo, por manager:
   - jugador que sale de una plantilla y entra en otra → operación de traspaso;
   - jugador que sale de mercado y entra en una plantilla → compra;
   - variación de `teamMoney` entre dos sincronizaciones, correlacionada con esos cambios de
     plantilla → importe **inferido** de la operación (no observado directamente: LALIGA no
     dice "compraste este jugador por X", pero si en el intervalo solo cambió una cosa, la
     diferencia de caja es ese importe).
   - jornada nueva detectada (`weekNumber` sube) + `teamPoints` sube → bonus de puntos de esa
     jornada, con protección de duplicados por `(league_id, manager_id, matchday)`.
3. **Validación continua**: `saldo_inicial_del_tracking + Σ movimientos detectados` debe
   coincidir con el `teamMoney` real leído en cada sync. Si no coincide, la diferencia se
   muestra como **"movimiento no explicado"** en vez de forzar el cuadre — eso es lo que
   pide el punto 9 del encargo (no inventar).

**Limitación que hay que comunicar en la UI sin suavizarla**: si la liga lleva jornadas
jugadas antes de activar el sync, esas operaciones anteriores **no se pueden recuperar**. El
ledger para esa liga empieza con la etiqueta *"saldo estimado desde fecha X"* que pide el
punto 4 del encargo, nunca como si fuera el histórico completo. Cuando `teamMoney` (real) y
`saldo_inicial_del_tracking + movimientos conocidos` (nuestro) no cuadran desde el primer día,
la diferencia es exactamente "todo lo que pasó antes de que empezáramos a mirar" — se
etiqueta así, no se reparte a ciegas entre categorías.

Precisión adicional sobre inferencia de precio de compra: es fiable cuando en el intervalo de
sync solo hubo **una** operación de ese manager; si hubo varias en el mismo intervalo (por
ejemplo compró dos jugadores entre dos sincronizaciones), el importe total sí es exacto
(`teamMoney` no miente) pero el reparto por jugador deja de ser atribuible con certeza. Ahí
la fila de ledger debe marcarse como "importe agregado, N operaciones sin desglosar" en vez
de repartir el gasto a partes iguales o adivinarlo — de nuevo, punto 9 del encargo. La forma
de minimizar esto es sincronizar con la frecuencia suficiente (varias veces al día);
frecuencia exacta a decidir según límites de la API (no auditados en esta fase).

---

## D. Riesgos

1. **Legal/ToS (bloqueante, ver §0).** Las condiciones de LALIGA no autorizan explícitamente
   el acceso vía endpoints privados no documentados ni el ROPC con la contraseña del usuario.
   `fantasy-copilot` ya pausó esto una vez por este motivo exacto. Aplica igual de fuerte a
   alertas, exportación y economía, porque las tres dependen de leer la liga privada.
2. **Endpoints no documentados, sujetos a romperse por temporada.** `AppFantasy` ya registró
   una rotura de temporada anterior. El host privado (`fantasy-api.llt-services.com`) es
   específico de 26/27; puede cambiar en 27/28 sin aviso.
3. **`winningPrice`/`winningManager` no confirmados en producción.** El propio código de
   `AppFantasy` los deja como opcionales "solo si la API los publica al resolverse la
   subasta" — no hay evidencia en el repo de que se haya visto ese campo relleno alguna vez.
   Hay que tratar la inferencia por delta de `teamMoney` (ver §C) como el camino principal,
   no como un plan B.
4. **La temporada 26/27 no había empezado a jugarse** en la fecha de la auditoría de
   `AppFantasy` (2026-08-05/07). A fecha de hoy (2026-08-13) puede que siga sin haber
   jornada 1 disputada — hay que comprobarlo contra la API real antes de dar por buena
   cualquier cifra de puntos de esta fase; si no ha empezado, las alertas de cláusula siguen
   siendo válidas (dependen del valor de mercado, que sí se mueve en pretemporada) pero el
   bonus por puntos no tendrá nada que sumar todavía.
5. **Un solo proceso sin persistencia = pérdida de histórico.** `session.ts` de `AppFantasy`
   guarda sesión en memoria si no hay `DATABASE_URL`; el registro append-only de operaciones
   (§C, punto 5 del encargo) necesita persistencia real desde el primer sync o se pierde en
   cada reinicio. Con Supabase ya configurado en `fantasy-copilot`, la vía natural es usar
   sus tablas (con RLS) en vez de levantar el Postgres propio de `AppFantasy`.
6. **`playerStats` por jornada sigue vacío** en la última comprobación documentada. No afecta
   a lo pedido en esta fase (no se pide desglose de puntos por jugador y jornada), pero
   descarta cualquier alerta futura basada en rendimiento reciente real.
7. **Rate limiting no auditado.** Ni `AppFantasy` ni esta auditoría han medido cuántas
   peticiones/minuto tolera el host privado antes de devolver 429. La frecuencia de sync
   (relevante para la precisión del ledger, punto anterior) debe fijarse con margen hasta que
   se mida.
8. **Fuente de scraping (`futbolfantasy.com`) fuera de alcance de esta fase.** Se documenta
   porque `AppFantasy` la usa para puntos por jornada, pero el encargo actual no pide ese
   desglose (solo pide no duplicar el bonus por puntos totales), así que no se incorpora
   ahora — mantenerla fuera reduce superficie de riesgo (scraping sin contrato).

---

## E. Plan de implementación (una vez resuelto §0)

Orden pensado para entregar valor verificable cuanto antes y dejar la economía (lo más
complejo) al final, apoyada en todo lo anterior:

1. **Capa de datos de solo lectura.** Portar `config.ts`, `schemas.ts`, `mappers.ts`,
   `client.ts`, `private.ts` (sin `writes.ts`) y `teams.ts` desde `AppFantasy` a
   `src/server/laliga/` de este repo, recortando lo que sea exclusivo de Copilot
   (`deriveForm` y similares). Sesión/login según lo que se decida en §0.
2. **Ruta `GET /api/fantasy/leagues/{id}/teams`** (equivalente a la que ya existe en
   `AppFantasy`): todos los managers + plantillas + `teamMoney` + `buyoutClause` en una sola
   llamada. Es la base de Liga, Alertas y Exportación A.
3. **Pantalla Liga**: managers + plantillas, solo lectura, sin ningún indicador de
   recomendación.
4. **`alerts/clause-alerts.ts`**: cálculo de `gap_clausula`, `porcentaje_gap`,
   `tendencia_diaria` (del histórico de `market-value`) y `dias_estimados`, con los niveles
   del encargo. Matemática pura, testeable sin red — mismo patrón que `recommendations.ts` de
   `AppFantasy` (motor puro, tests con datos fijos).
5. **`exports/`**: CSV A (equipos) y CSV B (mercado), generados en servidor a partir de las
   rutas ya existentes de los pasos 2 y del mercado de liga. Sin dependencias nuevas.
6. **`economy/transactions.ts` + `economy/points.ts`**: job de sync que compara snapshot
   anterior/nuevo (plantillas + mercado + `teamMoney` + `teamPoints`/jornada) y escribe en
   `fantasy_transactions` / `fantasy_point_income` (Supabase, con las claves de
   deduplicación del encargo). Empieza a acumular histórico desde el primer despliegue.
7. **`economy/ledger.ts`**: agregación por manager a partir de las tablas del paso 6 +
   `teamMoney` real como referencia de validación. Expone el desglose cronológico auditable.
8. **Pantalla Economía**: tabla de managers + vista de ledger por manager.
9. **Navegación final**: Liga / Alertas / Economía / Mercado / Exportar, sin Autopilot ni
   Copilot en ningún punto de entrada.

No se toca `writes.ts` ni ninguna operación de escritura en ningún paso: la app queda de
solo lectura contra LALIGA en toda esta fase.

---

## Preguntas abiertas antes de empezar a implementar

1. **Autenticación (§0, bloqueante).** ¿Procedo con login por email+contraseña (ROPC, como
   `AppFantasy`), o prefieres que el usuario pegue manualmente un `access_token`/cookie de
   sesión obtenido por su cuenta, para que la app nunca toque la contraseña de LALIGA?
2. **Persistencia del histórico**: ¿usamos las tablas Supabase ya configuradas en este repo
   (con RLS) para `fantasy_transactions`/`fantasy_point_income`, en vez de levantar el
   Postgres propio de `AppFantasy`?
3. **Alcance de "todos los managers"**: la contabilidad y las alertas de cláusula, ¿se
   calculan para todos los participantes de la liga (dato público dentro de la liga) o solo
   para el equipo del usuario logueado?

Con las respuestas a esto empiezo la implementación en el orden del punto E.
