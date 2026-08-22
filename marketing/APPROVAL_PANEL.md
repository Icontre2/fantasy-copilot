# Panel privado de aprobación (`/marketing`)

Quién puede tocar esto: **una sola persona**, la que esté en
`MARKETING_ADMIN_EMAILS`. No es un dashboard de equipo ni un producto — es el
control de calidad entre lo que produce la Creative Factory y lo que llegaría
a publicarse, y hoy **nada se publica**: eso es la fase siguiente, deliberada
y explícitamente fuera de este sprint.

## Qué hace

1. Lee `marketing/generated/<fecha>/<contentId>/package.json` — el fichero que
   escribe `scripts/marketing/prepare-agent-queue.mjs` y rellena
   `npm run marketing:generate` (ver `marketing/AGENT_RUNTIME.md` para cómo se
   genera ese contenido) — y lo enseña en una cola ordenada: pendiente de
   aprobar primero, bloqueado después, el resto por fecha.
2. Al abrir una pieza, enseña **todo** lo que hay que ver para decidir: el
   insight, el hook y sus alternativas, el guion, la estructura de escenas
   (con qué planos son captura real y de qué pantalla), los prompts de imagen
   y de Seedance, los captions por red, las plataformas recomendadas, el CTA,
   las fuentes, la feature real de LigaLab en la que se apoya, los riesgos, el
   resultado de QA y si hace falta una captura real. Nada detrás de un
   tooltip.
3. Desde ahí se puede **aprobar** (solo si está `pending_approval` y
   `qa.pass === true`), **rechazar** (con motivo obligatorio) o **editar**
   hook/guion/captions/CTA — nunca las fuentes, el score, la feature de origen
   ni el historial de QA. Cualquier edición marca la pieza como pendiente de
   revisar otra vez y bloquea la aprobación hasta que alguien vuelva a marcar
   QA.
4. Cada acción queda en un `auditTrail` que nunca se borra.

## Qué NO hace, a propósito

- **No publica nada.** Ningún botón llama a TikTok, Instagram ni YouTube.
  `PublisherAdapter` existe como interfaz (fase 9, en
  `src/server/marketing/adapters.ts`) pero su única implementación lanza un
  error: es el hueco para el día que se conecte, no una conexión.
- **No genera contenido.** El panel no llama a Seedance ni a ningún generador
  de imagen; solo lee lo que otro proceso (hoy, manual) ya dejó escrito.
- **No inventa capturas de la app.** Cuando una pieza necesita una pantalla
  real (Comparador, Plantilla, Histórico de jugador, Alertas de cláusula,
  Economía, Mercado…), el panel lo dice claramente y espera a que alguien la
  adjunte a mano — no genera ninguna interfaz falsa.
- **No sube ficheros.** Adjuntar una captura guarda de qué pantalla es y
  dónde está (una URL o una ruta), no el fichero. Conectar almacenamiento
  externo es otra fase; esto es lo que hace falta para no perder la pista de
  una captura que ya existe.

Adjuntar una captura **no cambia el estado ni obliga a repetir el QA**: es
registrar un hecho, no tomar una decisión — y es justo lo que ese QA pedía.
Queda en el audit trail como `capture_added`.

## Dónde vive cada cosa

| Qué | Dónde |
| --- | --- |
| Contratos (Zod) de radar/estrategia/QA/paquete/estado humano | `src/server/marketing/schemas.ts`, `state.ts` |
| Lectura de ficheros + fusión con el estado humano | `src/server/marketing/packages.ts` |
| Las cinco transiciones de estado (aprobar/rechazar/editar/QA/reabrir) | `src/server/marketing/actions.ts` |
| Estado humano en Supabase (`marketing_review_state`) | `src/server/marketing/store.ts`, migración `supabase/migrations/20260821_marketing_review_state.sql` |
| Quién puede entrar | `src/server/marketing/access.ts` |
| El punto que llaman las rutas | `src/server/marketing/service.ts` |
| Rutas de la API | `app/api/marketing/**` |
| El panel | `app/marketing/**` |
| Interfaces de la fase siguiente (imagen, vídeo, publicación, analítica) | `src/server/marketing/adapters.ts` |
| Modelo de métricas del loop de crecimiento (solo tipos) | `src/server/marketing/metrics.ts` |

## Las dos convenciones de `package.json`

En el repositorio conviven dos formas de escribir un paquete, y el panel lee
**las dos**:

| | Convención A | Convención B |
| --- | --- | --- |
| La escribe | `scripts/marketing/prepare-agent-queue.mjs` + `npm run marketing:generate` | A mano, siguiendo `marketing/templates/content-package.schema.json` |
| Id | `LL-YYYYMMDD-NNN` | `LL-YYYY-NNN` |
| Procedencia | `sourceOpportunityId`, `score` | `radarId`, `radarScore` |
| Problema | `problem` en la raíz | dentro de `strategy.problem` |
| Feature | `feature` (texto) | `product_truth[]` (lista) |
| Fuentes | `sources[]` | `source` (una sola) |
| Captura | `needsCapture` + planos `real_app_capture` | `needs_capture` + `capture_request` |
| QA | `{pass, blockedReasons, warnings, requiredChanges}` | `{brand_pass, product_truth_pass, facts_pass, notes}` |

`normalizarPaquete` (en `packages.ts`) traduce B → A al leer, sin tocar el
fichero. Cada traducción solo actúa si el campo destino falta, así que un
paquete de la convención A pasa intacto.

Esto no es una precaución teórica: la primera pieza real (`LL-2026-001`) llegó
escrita entera en la convención B y el panel la marcaba como «bloqueada».
`src/server/marketing/paquetes-reales.test.ts` recorre todo lo que hay en
`marketing/generated/**` en cada `npm test` justo para que eso no vuelva a
descubrirse mirando el panel.

## Por qué el estado humano vive en Supabase y no en el fichero

Una vez desplegado en Vercel, `marketing/generated/**` es de solo lectura: no
hay forma de que una ruta de la API reescriba ese `package.json` y que el
cambio sobreviva a la petición siguiente. Así que lo **estático** (lo que
produjo la Creative Factory) se lee del fichero, y lo que **decide una
persona** — aprobar, rechazar, editar, marcar QA — se guarda en
`marketing_review_state`, y las dos cosas se fusionan al leer.

## Acceso

Dos capas independientes, cada una capaz de negar el acceso por sí sola:

1. **La app.** `MARKETING_ADMIN_EMAILS` (variable de servidor, nunca en el
   cliente) decide quién entra. Sin la variable puesta, nadie entra — falla
   cerrado.
2. **La base de datos.** `marketing_review_state` tiene RLS activado y sus
   políticas comprueban `es_admin_de_marketing()`, una función
   `security definer` que compara el correo del JWT contra la misma lista
   (guardada en `app_secrets`, nunca en un fichero del repositorio). Si
   alguien hablara con Supabase directamente, sin pasar por la app, seguiría
   sin poder leer ni escribir una sola fila.

No usa `service_role`: como el resto del acceso social de LigaLab, funciona
con el JWT de quien ha entrado con Google/Facebook.

## Cómo probarlo en local

1. Añade tu correo a `MARKETING_ADMIN_EMAILS` en `.env.local`.
2. Entra en LigaLab con Google o Facebook una vez (para tener el JWT).
3. Escribe a mano un `marketing/generated/2026-08-21/LL-20260821-001/package.json`
   con al menos `id`, `date`, `status`, `sourceOpportunityId`, `score`,
   `problem`, `feature`, `hook`, `needsCapture` (ver `schemas.ts` para el resto
   de campos opcionales).
4. Abre `/marketing`.

## Tests

`src/server/marketing/*.test.ts` cubre, sin red ni sistema de ficheros real:
las cinco transiciones de estado y sus condiciones, la regla de acceso
(fail-closed), la lectura de paquetes (válidos, rotos, con alias de la
convención vieja), la RLS de la migración, y —por código estático— que
ninguna ruta ni componente del panel referencia una publicación externa.
