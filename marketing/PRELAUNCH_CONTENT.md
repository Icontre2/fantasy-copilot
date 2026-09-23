# LigaLab — PRELAUNCH_CONTENT

## Propósito
Fuente de verdad para contenido mientras LigaLab está en prelaunch. Este documento no crea una nueva línea creativa: limita qué puede prometer y mostrar la fábrica antes de que el producto esté listo para adquisición.

## Estado actual
- El contenido puede trabajar awareness, problema, pique social y build-in-public.
- No asumir disponibilidad pública, App Store/Google Play, onboarding abierto ni capacidad de captar tráfico a escala.
- No usar CTA de descarga/instalación/registro salvo que `PRODUCT_TRUTH.md` confirme explícitamente que ese flujo está disponible en producción.
- No publicar externamente desde la fábrica: `automation.config.json` mantiene `publishersEnabled=false` y exige aprobación humana antes de `generated` y `published`.

## Bloqueos de producto que afectan al contenido
Consultar `marketing/STRATEGY.md` y `marketing/PRODUCT_TRUTH.md` antes de cualquier claim. En particular, la estrategia vigente identifica fugas de login social, ausencia de analítica y requisitos legales como bloqueos para captar a escala. El contenido no debe ocultarlos mediante promesas de disponibilidad.

## Regla creativa vigente
El feedback humano más reciente invalida la dirección de copy anterior. Antes de proponer una nueva familia creativa, leer:
1. `marketing/creative-reset-2026-08-22.md`
2. `brand/VOICE.md`
3. `marketing/editorial-queue.json`

No empezar por un hook escrito. Empezar por una situación o idea visual observable. No inventar lenguaje “TikTok/Gen Z”.

## Dirección validada actualmente
La única dirección marcada como validada en la cola es `LL-2026-002`:

**vídeo de castigo → “para que no te pase esto” → captura REAL de LigaLab**

No añadir remates, emojis, claims de victoria ni reinterpretaciones sin nueva aprobación humana.

## Producto real solamente
- Capturas de producto: siempre reales.
- No recrear UI ni generar pantallas que parezcan LigaLab.
- No editar cifras/nombres para hacer una captura más atractiva.
- Si una caja es estimada, conservar `≈` y su contexto.
- No presentar consulta de alertas como push automático si esa automatización no está confirmada como activa en `PRODUCT_TRUTH.md`.

## Claims prohibidos en prelaunch
- “Descárgala ya”, “instálala”, “disponible ahora” sin confirmación real.
- “Gana tu liga”, “evita quedar último” o equivalentes como promesa causal.
- Usuarios, porcentajes de acierto, ahorro, rendimiento o testimonios inventados.
- Afiliación/oficialidad con LALIGA.
- Funciones futuras presentadas como actuales.

## CTAs seguros
Priorizar acciones propias del contenido: ver, comentar, compartir, guardar o seguir el build-in-public. Cuando aparezca LigaLab, puede identificarse como producto en construcción sin fingir disponibilidad.

## Cola
`marketing/editorial-queue.json` conserva IDs e historial. No reutilizar IDs rechazados ni duplicar temas. Un concepto `rejected` no se pule incrementalmente. Un `draft` con `REWRITE REQUIRED` necesita nueva dirección visual antes de avanzar.

## Salida de prelaunch
Este documento debe revisarse cuando cambie cualquiera de estas condiciones:
- disponibilidad pública real;
- login/onboarding apto para tráfico externo;
- analítica de adquisición/activación operativa;
- decisión legal/comercial que permita escalar;
- `publishersEnabled` cambie en `automation.config.json`.
