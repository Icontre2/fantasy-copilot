# Fantasy

App de consulta para una liga de LALIGA Fantasy. Cuatro cosas y ninguna más:

1. **Datos reales** de la liga (managers, plantillas, cláusulas, saldos).
2. **Alertas** de jugadores cuyo valor se acerca a su cláusula.
3. **Exportación** a CSV.
4. **Contabilidad** estimada de cada participante.

No hay Copilot, Autopilot, recomendaciones, predicciones, once recomendado ni
simuladores. Ese código vive en el repositorio de referencia
([`JavierContreras00/AppFantasy`](https://github.com/JavierContreras00/AppFantasy))
y **no se invoca desde aquí**.

```bash
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint
npm test
npm run build
```

## La regla que gobierna el proyecto

**Si no sabemos un dato, la app lo dice.** No hay estimaciones presentadas como
hechos, ni ceros que rellenen huecos. En la interfaz eso se traduce en un `—` y,
en los CSV, en una celda vacía. Cada pantalla distingue tres cosas:

| Etiqueta | Qué significa |
| --- | --- |
| **Dato oficial** | Lo publica LALIGA tal cual. Valor de mercado, cláusula, saldo (`teamMoney`), puntos, mercado. |
| **Cálculo nuestro** | Aritmética transparente sobre datos oficiales. Tendencia diaria, días estimados, importes de operaciones, bonus por puntos. |
| **Dato ausente** | La API no lo publica. Se muestra como desconocido y se explica por qué. |

## Arquitectura

El navegador **nunca** habla con LALIGA. Todo pasa por rutas propias, que es
donde vive el token y toda la lógica:

```
UI (app/fantasy/) -> /api/fantasy/* -> src/server/laliga/* -> API de LALIGA
```

```
src/server/laliga/
  config.ts      hosts, competición, timeouts
  schemas.ts     validación zod de cada respuesta real
  mappers.ts     API -> dominio (sin calcular nada)
  client.ts      fetch público y privado, solo GET
  read.ts        las lecturas que la app necesita
  auth.ts        login ROPC contra Azure B2C de LALIGA
  session.ts     sesión con tokens cifrados en Supabase
  alerts/        alertas de cláusula
  exports/       generación de CSV
  economy/       transacciones, puntos y ledger
```

No existe ningún módulo de escritura: la app no puja, no vende, no paga
cláusulas y no cambia alineaciones.

### Rutas

| Ruta | Devuelve |
| --- | --- |
| `POST /api/fantasy/auth/login` | inicia sesión → cookie httpOnly |
| `GET /api/fantasy/auth/session` | manager conectado |
| `POST /api/fantasy/auth/logout` | cierra sesión |
| `GET /api/fantasy/leagues` | tus ligas |
| `GET /api/fantasy/leagues/{id}/teams` | clasificación + plantilla de cada participante |
| `GET /api/fantasy/leagues/{id}/market` | mercado actual |
| `GET /api/fantasy/leagues/{id}/alerts` | alertas de cláusula |
| `GET /api/fantasy/leagues/{id}/economy` | ledger por manager |
| `POST /api/fantasy/leagues/{id}/economy/sync` | toma una foto y detecta operaciones |
| `GET /api/fantasy/leagues/{id}/export/teams` | `equipos_liga_<id>_<fecha>.csv` |
| `GET /api/fantasy/leagues/{id}/export/market` | `mercado_<id>_<fecha>.csv` |

## Alertas de cláusula

Aritmética, no un modelo. Para cada jugador con cláusula publicada:

```
gap            = clausula - valor_actual
porcentaje_gap = gap / clausula
tendencia      = variación media diaria del valor (ventana de 7 días)
dias_estimados = gap / tendencia        (solo si la tendencia es positiva)
```

Niveles:

| Nivel | Criterio |
| --- | --- |
| **CRÍTICA** | valor ≥ 95 % de la cláusula |
| **ALTA** | valor ≥ 90 % de la cláusula, o estimación ≤ 3 días |
| **MEDIA** | estimación ≤ 7 días |
| **INFORMATIVA** | subida ≥ 0,5 %/día pero todavía lejos |

El umbral de INFORMATIVA es el único que no venía fijado en el encargo: por
debajo de 0,5 % diario el ruido normal del mercado ya explica el movimiento.

Los umbrales se evalúan **en ese orden**, así que el ratio de valor manda sobre
el plazo. Un jugador al 91 % de su cláusula sale ALTA aunque su estimación sean
5 días.

Dos límites conocidos:

- Un jugador **sin `buyoutClause` publicada no genera alerta**. Sin cláusula no
  hay nada con lo que comparar.
- Solo se descarga el histórico de cotización de los jugadores que ya superan el
  60 % de su cláusula (tope de 150 por refresco). Un jugador muy lejos pero
  subiendo mucho no aparecerá hasta acercarse. La pantalla dice cuántos se han
  quedado fuera.

## Contabilidad

**El saldo no se reconstruye: LALIGA lo publica.** `teamMoney` es un dato
oficial y exacto de *todos* los managers de la liga, no solo del tuyo. Esa es la
columna "Saldo oficial" y no la calcula esta app.

Lo que sí aporta la app es el **desglose**, y ahí hay un límite duro: **LALIGA no
publica ningún histórico de operaciones**. No hay endpoint de compras, ventas,
pujas resueltas, `winningPrice` ni `winningManager`. Lo único observable es una
foto del momento.

Por eso el ledger funciona comparando fotos consecutivas:

| Se observa | Se deduce |
| --- | --- |
| jugador pasa de la plantilla de A a la de B | traspaso entre managers |
| jugador estaba en el mercado y aparece en B | compra al mercado |
| jugador sale de A y no aparece en nadie | venta al mercado |

El **importe** no es observable en ningún caso: se infiere de cuánto varió la
caja del manager, descontando antes el ingreso por puntos del mismo intervalo.
Esa inferencia solo es atribuible si el manager hizo **exactamente una**
operación entre dos sincronizaciones. Con dos o más, el importe se deja **sin
atribuir** en lugar de repartirlo a ojo.

Consecuencias que la app muestra en pantalla en vez de disimular:

- **El ledger empieza el día de la primera sincronización.** Lo anterior no se
  puede recuperar.
- **"Saldo previo"** = saldo oficial − neto conocido. Es el dinero que ya tenía
  el manager antes de empezar a mirar, más cualquier movimiento no detectado.
  **No es el saldo inicial de la liga**: ese dato no lo publica la API.
- Cuanto más frecuente sea la sincronización, mejor el reparto de importes.

### Bonus por puntos: 100.000 € por punto

La protección contra contar dos veces no consiste en acordarse de no sumar:
**aquí nunca se suma, se escribe un valor absoluto**.

LALIGA publica `teamPoints`, el acumulado de temporada. Lo que se guarda por
jornada es su reparto:

```
puntos_jornada_N = teamPoints_observado - Σ puntos ya atribuidos a jornadas < N
```

y la fila se escribe con UPSERT sobre `(league_id, manager_id, matchday)`. De
ahí salen las dos propiedades exigidas:

- **Determinista**: dos sincronizaciones con la misma observación producen la
  misma fila, no una fila el doble de grande.
- **Sin duplicados por construcción**: `Σ puntos = teamPoints` siempre.
  Sincronizar cien veces deja el total igual que sincronizar una.

## Base de datos

Migración en `supabase/migrations/`. Cuatro tablas, todas con RLS activado y
**cero políticas** (deny-by-default para `anon` y `authenticated`; solo el
servidor con `service_role` escribe):

| Tabla | Para qué |
| --- | --- |
| `fantasy_sessions` | tokens de LALIGA cifrados (AES-256-GCM) |
| `fantasy_league_snapshots` | fotos de la liga, base de la detección de operaciones |
| `fantasy_transactions` | operaciones detectadas, con `transaction_external_id` único |
| `fantasy_point_income` | ingreso por puntos, único por `(liga, manager, jornada)` |

## Configuración

Ver `.env.example`. Lo imprescindible: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` y `SESSION_ENCRYPTION_KEY`.

## Sesión y credenciales

El login usa el flujo Azure AD B2C (ROPC) de LALIGA, el mismo que la app oficial
para el login por email. La contraseña se intercambia una vez por tokens y **se
descarta**: no se guarda, no se registra y no vuelve al navegador. Los tokens se
guardan cifrados en Supabase; al cliente solo viaja un id opaco en una cookie
httpOnly.

**No funciona con cuentas de Google, Apple o Facebook**: no tienen contraseña en
el proveedor de identidad de LALIGA.

Uso personal. Las condiciones de LALIGA Fantasy limitan el juego al ámbito
personal y privado y exigen consentimiento escrito para uso comercial; los
endpoints privados no están documentados públicamente y pueden cambiar sin
aviso. El análisis completo está en
[`docs/AUDITORIA_FASE_1.md`](docs/AUDITORIA_FASE_1.md).

## Lo que no se puede hacer, y por qué

| Se ha pedido | Por qué no está |
| --- | --- |
| Precio y fecha de adquisición de cada jugador | No aparecen en el endpoint de plantilla |
| Puja actual y quién puja | Solo es visible tu propia puja, ni siquiera en vivo |
| Identidad del vendedor en el mercado | La API solo da un tipo de entrada, no el manager |
| Saldo inicial de la liga | Ningún endpoint expone la configuración económica |
| Histórico de operaciones anterior a la primera sincronización | No existe endpoint de histórico |
| Puntos por jornada de un manager | Solo hay acumulado; el reparto por jornada es cálculo nuestro |

## Estado del código anterior

`app/fantasy-app.tsx`, `app/laliga-provider.ts` y `app/csv-import.ts` son la app
anterior (importación manual/CSV). **Están desacoplados**: nadie los monta.
Se conservan mientras el conector nuevo se valida contra una liga real.
