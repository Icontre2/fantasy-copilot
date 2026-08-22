# Traspaso — sistema de agentes de marketing

Escrito el **2026-08-22**, sobre `main` en `f5b5572`. Contexto para retomar el
trabajo en una conversación nueva.

Repo: `Icontre2/fantasy-copilot` (Next.js 16 App Router, TypeScript estricto,
Zod, Supabase, Vercel). Código y comentarios en español.

---

## ⚠️ Lo primero: hay un choque de vocabulario sin resolver

El commit `f5b5572` («Refactor Creative Factory to single orchestrator»)
cambió `marketing/automation.config.json` y **dejó el panel y la configuración
hablando idiomas distintos**:

| | Estados |
| --- | --- |
| `automation.config.json` (después del refactor) | `radar`, `draft`, **`review`**, `pending_approval`, `approved`, `rejected`, `generated`, `published`, `blocked` |
| `ESTADOS` en `src/server/marketing/schemas.ts` | `draft`, **`brand_review`**, **`fact_review`**, `pending_approval`, `approved`, `rejected`, `blocked`, `generated`, `published` |

El refactor fusionó `brand_review` + `fact_review` en un solo `review`. El
código no lo sabe.

**Consecuencia concreta:** un paquete que llegue con `status: "review"` **no
valida** y el panel lo enseñará como «bloqueado» — exactamente el mismo fallo
que tuvo la pieza `LL-2026-001` y que se arregló en la PR #48. Además,
`actions.ts` sigue transicionando a `brand_review` al fallar el QA, al editar
y al reabrir, que ya no es un estado del config.

**Es una decisión de producto, no un bug obvio.** Hay que elegir:

- **(a) Adoptar `review`**: añadirlo a `ESTADOS`, traducir `brand_review`/
  `fact_review` → `review` al leer (igual que hace `normalizarPaquete` con la
  convención antigua), y cambiar `actions.ts` para transicionar a `review`.
  Es lo coherente con el refactor.
- **(b) Mantener los tres estados** y revertir esa parte del config.

Recomiendo (a): el refactor tiene sentido —una sola pasada de orquestador no
necesita distinguir revisión de marca de revisión de hechos— y la traducción
defensiva ya existe como patrón.

---

## Qué existe y funciona hoy

### Panel privado `/marketing` (en producción)

Cola de creativos, ficha con 15 campos, aprobar/rechazar/editar/marcar QA/
reabrir/adjuntar captura, audit trail. Acceso por allowlist de email
(`MARKETING_ADMIN_EMAILS`) **más** RLS propia en Supabase
(`marketing_review_state`, función `es_admin_de_marketing()`, sin
`service_role`). Documentado en `marketing/APPROVAL_PANEL.md`.

El estado humano vive en Supabase, no en el fichero: en Vercel el filesystem
es de solo lectura. Lo estático se lee del `package.json`; lo que decide una
persona se guarda aparte y se fusiona al leer (`fusionarPaquete`).

### Motor de agentes ejecutable

    npm run marketing:radar    -- <fecha>   # Fantasy Radar, con búsqueda web real
    npm run marketing:queue    -- <fecha>   # selecciona candidatos (script .mjs preexistente)
    npm run marketing:generate -- <fecha>   # Strategist → Copywriter → Creative
                                            # Director → Video Director → Brand Reviewer

Código en `src/server/marketing/pipeline/`:

- `claude.ts` — único sitio que importa `@anthropic-ai/sdk`. Expone el tipo
  `LlamadaClaude`, que todo lo demás recibe **por parámetro**. Por eso los
  tests son offline y no gastan tokens.
- `json.ts` — `pedirJSON`: valida contra Zod, **un** reintento con el error
  real devuelto al modelo, nunca más (evita quemar tokens en bucle).
- `stages.ts` — schemas + prompts de las cinco etapas caras.
- `radar.ts` / `creative.ts` — orquestación.
- `docs.ts` — carga `agents/*.md` + `brand/*.md` + `marketing/*.md` **reales**
  como contexto de cada etapa. Nada de prompts inventados a mano.

Modelos: `MARKETING_AGENT_MODEL_CHEAP` (Haiku 4.5, solo el Radar, con búsqueda
web) y `MARKETING_AGENT_MODEL` (Opus 5, cadena creativa). Requiere
`ANTHROPIC_API_KEY`; sin ella los comandos **se niegan a correr** en vez de
inventar contenido.

> **Ojo:** el motor implementa la cadena de 5 etapas *anterior* al refactor de
> `f5b5572`. El nuevo `agents/orchestrator.md` propone una sola pasada
> coordinada, con los specialists como referencia y no como agentes
> secuenciales. **El código todavía no refleja eso.**

### Datos reales en el repo

- `marketing/radar/2026-08-22.json` — **14 oportunidades**, scores 74-95, todas
  con fuente verificable. Convención nueva.
- `marketing/generated/2026-08-22/LL-2026-001/` — **una sola pieza**, escrita a
  mano (no por el script). `status: pending_approval`, `qa.pass: true`,
  `needsCapture: true`. Convención antigua.
- **13 oportunidades del radar sin convertir en pieza.**

---

## Las dos convenciones de `package.json`

Conviven de verdad y el panel lee las dos. `normalizarPaquete` en
`src/server/marketing/packages.ts` traduce antigua → nueva al leer, **sin
tocar el fichero**:

| | Nueva (la escribe el motor) | Antigua (`marketing/templates/content-package.schema.json`) |
|---|---|---|
| Id | `LL-YYYYMMDD-NNN` | `LL-YYYY-NNN` |
| Procedencia | `sourceOpportunityId`, `score` | `radarId`, `radarScore` |
| Problema | `problem` raíz | `strategy.problem` |
| Feature | `feature` (texto) | `product_truth[]` |
| Fuentes | `sources[]` | `source` (una sola) |
| Captura | `needsCapture` + planos | `needs_capture` + `capture_request` |
| QA | `{pass, blockedReasons, warnings, requiredChanges}` | `{brand_pass, product_truth_pass, facts_pass, notes}` |

`src/server/marketing/paquetes-reales.test.ts` es un **canario**: recorre todo
`marketing/generated/**` en cada `npm test` y falla si el panel no puede leer
algo. Se añadió porque la primera pieza real salió «bloqueada» y ningún test
de fixture lo habría pillado — los fixtures se escriben con la forma que uno
ya sabe leer.

---

## Lo que NO existe todavía

1. **Growth Analyst sin ejecutar.** `agents/growth-agent.md` es el único de los
   prompts sin etapa ejecutable. Está bloqueado detrás de que exista
   publicación y métricas reales. `src/server/marketing/metrics.ts` tiene los
   tipos (views, retención 3s, watch time, completion, likes, comments,
   shares, saves, profile visits, link clicks, installs, conversion) y **cero
   lógica**, a propósito.
2. **Orquestador sin implementar.** `agents/orchestrator.md` existe como
   documento desde `f5b5572`; el código sigue ejecutando la cadena de cinco
   etapas.
3. **Generación de imagen y vídeo.** `src/server/marketing/adapters.ts` tiene
   `ImageGeneratorAdapter`, `VideoGeneratorAdapter`, `PublisherAdapter` y
   `AnalyticsAdapter` como interfaces; cada implementación lanza
   `AdapterNoConectado`. Nada de Seedance ni Nano Banana real.
4. **Publicación.** Deliberadamente sin conectar. Ningún botón del panel ni
   ninguna etapa llama a TikTok/Instagram/YouTube. `no-publish.test.ts` escanea
   el código y falla si aparece.
5. **La pipeline no corre en Vercel.** Filesystem de producción de solo
   lectura. Hoy: ejecutar en local → comitear lo generado → desplegar.

---

## Restricciones que conviene mantener

- No tocar login, mercado, caja, plantillas ni lógica Fantasy salvo que sea
  imprescindible para marketing.
- No inventar features, cifras, pantallas ni datos.
- No recrear capturas falsas de LigaLab: las capturas de producto son reales o
  no hay.
- Nada se publica sin aprobación humana.
- El branding rojo de marketing, solo dentro de `/marketing`.

---

## Estado técnico

`npm run typecheck`, `npm run lint`, `npm test` (**322 en verde**), `npm run
build` — todo pasa en `main`. Los tests de la pipeline usan una
`LlamadaClaude` falsa: no gastan ni un token.

Sin PRs abiertas. Fusionado hoy: #47 (panel + motor), #48 (leer la convención
antigua), #49 (adjuntar capturas), #50 (identidad persistente).

Dos decisiones de las últimas PRs que conviene no deshacer por accidente:

- **Adjuntar una captura no cambia el estado ni obliga a repetir el QA.** Es
  registrar un hecho, y es justo lo que el QA pedía.
- **La identidad del panel se renueva sola** con el `refresh_token` de Supabase
  (`llf_user_refresh`, 30 días). Supabase **rota** ese token al renovar: hay
  que guardar el nuevo. Es el mismo fallo que tumbó el enlace con LALIGA; hay
  un test que lo fija. `identidadDePeticion` —la del producto— se dejó intacta
  a propósito.

---

## Pendiente que no es código

**Confirmar que `MARKETING_ADMIN_EMAILS` está bien puesta en Vercel.** La
última comprobación dio «Acceso denegado» *sin correo*, lo que apunta a falta
de identidad y no a la allowlist — probablemente por abrir el enlace desde el
navegador incrustado de otra app, que tiene sus propias cookies. Hay que
probarlo en Safari o desde LigaLab instalada.

---

## Qué haría a continuación

En este orden, y con el porqué:

1. **Resolver el choque de estados** (arriba). Es lo único que puede dejar una
   pieza nueva sin poder revisarse, y ya pasó una vez.
2. **Decidir si el código adopta el orquestador único.** Hoy documento y
   código discrepan; cuanto más tarde, más caro.
3. **Automatizar la tanda diaria** en GitHub Actions (cron +
   `ANTHROPIC_API_KEY` como secret + commit de lo generado). Es lo que
   convierte esto en un sistema que corre solo. Vigilar el coste: un radar
   barato + hasta 3 piezas caras al día.
4. **Unificar las dos convenciones** de `package.json`, ahora que la traducción
   funciona y se puede migrar sin romper nada.
5. **Conectar generación de imagen** — el adapter más barato y menos arriesgado
   de los tres.

Antes de escribir código: inspecciona `marketing/`, `agents/`, `brand/` y
`src/server/marketing/`, y resume en 8-12 líneas qué has encontrado, qué vas a
reutilizar y qué riesgos ves.
