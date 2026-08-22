# Subagentes de marketing de LigaLab

Seis agentes de Claude Code que producen una pieza de contenido de principio a
fin. Fase B del documento maestro (*LigaLab — Sistema de Agentes: Arquitectura,
Fases y Operación*).

## Cómo se usa

Se invoca **solo al Orchestrator**:

> Genera la mejor pieza prelaunch de hoy.

Él decide si necesita Radar, a qué especialistas consulta, qué formato usa y si
hace falta captura. No pregunta entre fases — si te está pidiendo permiso para
consultar al Copywriter, algo va mal.

## Quién es quién

| Agente | Papel | Herramientas | Escribe |
| --- | --- | --- | --- |
| `orchestrator` | Responsable del resultado final | Read, Grep, Glob, Write, Edit | Sí, solo `marketing/generated/` |
| `strategist` | Ángulo e insight | Read, Grep, Glob | No |
| `copywriter` | Hooks, guion, CTA, captions | Read, Grep, Glob | No |
| `creative-director` | Sistema visual 9:16 | Read, Grep, Glob | No |
| `video-director` | Tiempo y movimiento — **opcional** | Read, Grep, Glob | No |
| `brand-reviewer` | PASS / FIX / BLOCK | Read, Grep, Glob | No |

Un jefe, varios especialistas. Los especialistas **no se llaman entre sí**: no
existe la cadena `Strategist → Copywriter → …`. Cada uno aconseja al
Orchestrator y vuelve.

## Por qué solo el Orchestrator escribe

Porque el resultado tiene un responsable. Si cinco agentes pudieran escribir en
`marketing/generated/`, una pieza a medias sería el estado normal y nadie
sabría quién la dejó así. Los especialistas tienen `Read, Grep, Glob` y nada
más: no es una restricción de confianza, es lo que hace que su salida sea
consumible en vez de un efecto secundario.

Ningún agente puede tocar UI, backend, lógica de producto, `marketing/PRODUCT_TRUTH.md`
ni `brand/**`. Ninguno publica en ninguna red: ese camino no existe en el
código, y `src/server/marketing/no-publish.test.ts` falla si alguien lo añade.

## Las reglas que no son negociables

- **Actualidad sin evidencia no se produce.** Evergreen no necesita Radar; una
  pieza de actualidad sin fuente verificable degrada a evergreen. La ausencia
  de evidencia nunca se convierte en un hecho.
- **Una sola autocorrección.** Tras un `FIX` el Orchestrator corrige y vuelve a
  pedir revisión una vez. Un segundo `FIX` termina en `blocked`. No hay
  terceras vueltas y no hay loops.
- **La captura de producto es real o no hay.** `needs_capture` se deriva de los
  planos: es `true` si y solo si hay algún `real_app_capture`, y entonces
  `capture_request` dice qué pantalla exacta hace falta.
- **Un `contentId` nunca se pisa.** Si `LL-<fecha>-001` existe, se usa el
  siguiente número libre.
- **Si el Reviewer se cae, no se aprueba.** El estado es `review_pending`. Una
  caída no es un permiso.

## Un solo fichero por agente

Estos `.md` son ahora la **única** definición de cada agente. Antes vivían
duplicados en `agents/` (los prompts que carga la pipeline `marketing:generate`)
y aquí; esa carpeta ya no existe.

Se puede unificar porque la misión, las reglas y las prohibiciones son las
mismas se invoque a quien se invoque. Lo que **no** es lo mismo es el contrato
de salida:

| Invocado como | Devuelve | Lo valida |
| --- | --- | --- |
| Subagente de Claude Code | el contrato del documento maestro (`best_hook`, `spoken_script`, `ctas`…) | `src/server/marketing/agents/contracts.ts` |
| Etapa de `marketing:generate` | los campos de `PaqueteCrudo` (`hook`, `script`, `cta`…) | `src/server/marketing/pipeline/stages.ts` |

Por eso la pipeline carga solo la parte de ROL: `soloElRol` (en
`src/server/marketing/pipeline/docs.ts`) corta en `## Devuelves` y descarta el
frontmatter. Si cargara el fichero entero, cada etapa recibiría dos
especificaciones de salida contradictorias.

**Consecuencia práctica al editar estos ficheros:** todo lo que escribas encima
de `## Devuelves` lo van a leer las dos rutas, así que no nombres ahí campos de
un contrato concreto. Los nombres de campo van en `## Devuelves`.

Los dos prompts que no son subagentes viven en `marketing/prompts/`:
`fantasy-radar.md` (lo carga `marketing:radar`) y `growth-agent.md` (sin etapa
ejecutable todavía).

## Dónde vive cada cosa

Los `.md` de esta carpeta son lo que lee Claude. Las reglas que se pueden
ejecutar están además en código, porque una regla que solo vive en prosa no se
puede comprobar:

- `src/server/marketing/agents/contracts.ts` — los contratos de salida de cada
  especialista, como esquemas de Zod.
- `src/server/marketing/agents/policy.ts` — las decisiones del Orchestrator
  (evergreen/actualidad, Video Director opcional, PASS/FIX/BLOCK,
  autocorrección única, recuperación de fallos, context packets).
- `src/server/marketing/agents/policy.test.ts` — los diez escenarios de la
  Fase C ejecutados contra esas decisiones.
- `src/server/marketing/agents/agents-reales.test.ts` — comprueba estos siete
  ficheros: frontmatter válido, permisos mínimos y que toda ruta que citan
  existe de verdad en el repositorio.
- `src/server/marketing/pipeline/docs.test.ts` — comprueba que el corte por
  `## Devuelves` no se lleva por delante el rol ni deja pasar el contrato.

## Lo que estos agentes NO hacen todavía

- No se ejecutan solos: hay que abrir Claude Code e invocar al Orchestrator
  (Fase E pendiente).
- No generan imagen ni vídeo: `src/server/marketing/adapters.ts` sigue con
  interfaces sin conectar.
- No publican, y no van a publicar sin una decisión explícita.
