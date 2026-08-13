# Traspaso: estado real del proyecto y qué falta

Fecha: 2026-08-13. Rama: `claude/fantasy-app-audit-3nysmu`.

Documento para que otra persona (u otro agente) siga sin tener que releer todo el
historial. Dice qué está hecho, qué está **sin verificar**, y qué es lo siguiente.

---

## Lo más importante que hay que saber

**Nada de esto se ha ejecutado nunca contra la API real de LALIGA.** Ni una
petición. Todo lo escrito se apoya en la auditoría de código de
[`JavierContreras00/AppFantasy`](https://github.com/JavierContreras00/AppFantasy)
(commit `65e813b`), que sí documenta pruebas reales, pero **este** repositorio no
ha hablado con LALIGA todavía.

Lo que está probado son 53 tests de la aritmética pura (alertas, ledger,
detección de operaciones, CSV, estado de sincronización), sin red. Eso demuestra
que las cuentas salen, **no** que los datos de entrada sean los que esperamos.

Consecuencia práctica: el primer arranque real puede fallar en el parseo, y ese
fallo es informativo — `LaligaError('invalid_response')` dice el campo exacto que
no encaja con el schema de `src/server/laliga/schemas.ts`.

---

## Cómo arrancarlo

```bash
npm install
npm run dev     # http://localhost:3000
```

Variables necesarias (ver `.env.example` para el detalle de cada una):

| Variable | Para qué | ¿Obligatoria? |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | sesión persistente e histórico | Sí |
| `SESSION_ENCRYPTION_KEY` | cifrado AES-256-GCM de los tokens (mín. 32 chars) | Sí |
| `CRON_SECRET` | autoriza la tarea programada | Solo para auto-sync |

Migraciones a aplicar en Supabase, en orden:

1. `supabase/migrations/20260813_fantasy_economy.sql`
2. `supabase/migrations/20260813b_fantasy_sync_schedule.sql`

Las cuatro tablas llevan RLS activado y **cero políticas** a propósito: solo las
escribe el servidor con `service_role`, que salta RLS por definición. Es
deny-by-default para `anon` y `authenticated`, no un descuido.

---

## Qué está hecho

### Conector de solo lectura — `src/server/laliga/`

Portado de `AppFantasy` recortando todo lo de Copilot. `config.ts`, `schemas.ts`
(zod), `mappers.ts`, `client.ts`, `read.ts`, `session.ts`, `auth.ts`,
`token-crypto.ts`, `teams.ts`.

**No se portó `writes.ts`.** La app no puja, no vende, no paga cláusulas, no
blinda y no alinea. Es de solo lectura contra LALIGA.

### Alertas de cláusula — `src/server/laliga/alerts/`

`gap = clausula − valor`, `%gap`, tendencia diaria del histórico de cotización,
`dias_estimados = gap / tendencia` (solo con tendencia positiva y suficientes
puntos). Niveles CRÍTICA / ALTA / MEDIA / INFORMATIVA según lo pedido.

Un jugador **sin `buyoutClause` publicada no genera alerta**, en vez de asumir un
valor.

### Exportación CSV — `src/server/laliga/exports/`

Equipos y mercado, generados en servidor. Las columnas que la API no publica
(precio y fecha de adquisición, puja ajena, vendedor) **se omiten y se
documentan**, en lugar de emitirse siempre vacías.

### Economía — `src/server/laliga/economy/`

| Fichero | Qué hace |
| --- | --- |
| `transactions.ts` | compara dos fotos y deduce qué pasó entre medias |
| `points.ts` | 100.000 €/punto, con valor absoluto (no incremental) |
| `ledger.ts` | agrega por manager |
| `sync.ts` | captura foto, persiste, construye el informe |
| `schedule-status.ts` | **puro**: diagnóstico y auth del cron (testeado) |
| `schedule.ts` | IO de la sincronización automática |

Las tres decisiones que sostienen todo esto:

1. **El saldo no se calcula: se lee.** LALIGA publica `teamMoney` exacto de todos
   los managers de la liga. Lo que se reconstruye es el *desglose*.
2. **El importe de una operación no es observable.** Se infiere de la variación
   de caja, y **solo** es atribuible si el manager hizo una única operación entre
   dos fotos. Con dos o más, el importe queda en `null` con motivo — no se
   reparte a partes iguales.
3. **El residuo va a "saldo previo", no se fuerza el cuadre.** Es explícitamente
   "lo que ya tenía antes de que empezáramos a mirar, más lo no explicado".

### Sincronización automática (lo último añadido)

- Tabla `fantasy_sync_subscriptions`: qué ligas se sincronizan solas y con qué
  sesión (la tarea programada no tiene cookie de navegador).
- `GET /api/cron/economy-sync`, autorizada por `CRON_SECRET` en tiempo constante.
  **Sin la variable configurada responde 401 a todo el mundo**: un endpoint que
  dispara lecturas de la cuenta de alguien no se queda abierto por un despiste de
  configuración.
- `vercel.json` la programa cada 3 horas. `EXPECTED_SYNC_INTERVAL_MINUTES` en
  `schedule-status.ts` **debe coincidir** con ese cron: es lo que decide cuándo
  una liga se considera retrasada.
- Panel en Economía con cinco estados (OFF / PENDING / OK / LATE / STOPPED).

La regla de diseño: **una sincronización que no corre debe ser visible.** Si la
sesión caduca, el ledger no se equivoca — se queda quieto — pero seguiría
presentándose como si estuviera al día. Por eso la sesión caducada para la
suscripción, la marca, y la UI lo dice en rojo.

---

## Qué NO está verificado (lo importante)

| Cosa | Estado | Cómo verificarlo |
| --- | --- | --- |
| Cualquier respuesta real de LALIGA | **Sin verificar** | arrancar y entrar en una liga |
| Login ROPC desde este repo | **Sin verificar** | `POST /api/fantasy/auth/login` |
| `runScheduledSyncs()` | **Sin ejecutar** | ver abajo |
| Detección de operaciones con datos reales | **Sin verificar** | requiere 2 sincronizaciones con un fichaje entre medias |
| Límite de peticiones/minuto de LALIGA | **Sin medir** | por eso el cron va secuencial y limitado a 10 ligas |
| ¿Ha empezado la temporada 26/27? | **Sin comprobar** | si no hay jornada jugada, el bonus por puntos no tendrá nada que sumar |

Probar el cron a mano:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/economy-sync
```

---

## Decisión pendiente, y es del usuario

`docs/laliga-readonly-integration.md` (escrito antes de este rediseño) dice que
la integración está **bloqueada hasta autorización escrita de LALIGA**, y que la
app "no pedirá credenciales, no ejecutará ROPC y no llamará a endpoints
privados".

El código actual hace exactamente esas tres cosas. Se implementó porque era la
única forma de cumplir lo pedido (todo depende de leer la liga real), y con las
cautelas técnicas que se pudieron: tokens cifrados, nunca en el cliente, cero
escrituras contra LALIGA, uso personal.

**Ese documento sigue contradiciendo al código y hay que resolverlo**: o se
actualiza explicando la decisión y su alcance, o se revierte el conector. No es
una decisión técnica.

---

## Siguiente paso recomendado

1. Aplicar las dos migraciones y arrancar con credenciales reales.
2. Entrar en una liga y ver qué falla. Si algo revienta será en el parseo, con el
   campo señalado.
3. Sincronizar dos veces con un fichaje entre medias y comprobar que la operación
   aparece en el ledger con importe atribuido.
4. Solo entonces activar el cron en producción.

Lo que **no** conviene hacer todavía: añadir funcionalidad nueva. Hay bastante
código sin una sola confirmación contra datos reales; ampliarlo antes de validar
multiplica lo que habrá que rehacer si un schema no encaja.
