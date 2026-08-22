# LigaLab Creative Factory

## Objetivo
Convertir oportunidades verificables en contenido listo para revisión humana, sin publicar automáticamente y sin depender de que la app esté terminada.

## Modos de contenido

### 1. Prelaunch — ACTIVO por defecto hasta lanzamiento
Permite publicar ya sin enseñar una app incompleta. Prioriza:
- dolores reales de jugadores Fantasy;
- errores de decisión y situaciones reconocibles;
- educación sobre cláusulas, caja, mercado, valor y onces probables;
- preguntas, dilemas y POVs;
- build in public de LigaLab, dejando claro que está en desarrollo cuando corresponda;
- teasers de funciones solo si PRODUCT_TRUTH confirma que existen, sin prometer disponibilidad pública.

En prelaunch NO es obligatorio mostrar producto. Si no hay captura necesaria, `needs_capture=false` y el creativo puede resolverse con tipografía, motion, escenas de fútbol genéricas y elementos de marca.

### 2. Product proof
Se usa cuando la pieza necesita demostrar una función concreta. Si se enseña LigaLab:
- `needs_capture=true` hasta disponer de captura real;
- jamás generar, reconstruir o recolorear la UI;
- el framing de marketing sí puede envolver la captura.

## Modelo operativo
Una única pasada coordinada por el Orchestrator. Los documentos de `agents/` son criterios especializados, no gates secuenciales obligatorios.

## Inputs
- `brand/BRAND.md`
- `brand/VOICE.md`
- `brand/CONTENT_RULES.md`
- `marketing/PRODUCT_TRUTH.md`
- `marketing/CONTENT_ENGINE.md`
- `marketing/PRELAUNCH_CONTENT.md`
- `marketing/automation.config.json`
- `marketing/radar/YYYY-MM-DD.json` cuando la pieza dependa de actualidad

## Fuentes de oportunidades
Hay dos vías válidas:
1. `radar`: hechos o conversaciones actuales; requiere evidencia estructurada.
2. `evergreen_prelaunch`: pain points y conceptos permanentes definidos en `PRELAUNCH_CONTENT.md`; no requiere inventar un hecho del día.

Si una idea contiene una afirmación actual, cifra, jugador, partido o noticia, necesita Radar/evidencia. Las piezas evergreen no pueden disfrazarse de actualidad.

## Producción diaria
- Crear 1 pieza fuerte por defecto.
- Máximo 3 si son claramente distintas y fuertes.
- Mezcla recomendada mientras no haya lanzamiento: 70% evergreen/prelaunch, 20% actualidad Fantasy, 10% producto/build in public.
- No retrasar contenido porque falte una captura si el concepto funciona sin producto.

## Orquestación
Resolver en una pasada:
- ángulo;
- hook;
- guion;
- concepto visual;
- especificación de vídeo si aporta valor;
- captions;
- Brand Review + Product Truth + fact check.

Si Reviewer detecta un fallo corregible, aplicar una autocorrección y volver a revisar. Bloquear solo por falta real de evidencia, violación de Product Truth, datos inventados, privacidad o integridad de producto.

## Archivos por oportunidad
`marketing/generated/YYYY-MM-DD/<contentId>/`
- `brief.md`
- `package.json`
- `script.md`
- `seedance-prompt.md`
- `image-prompt.md`
- `captions.md`
- `qa.md`

## Reglas
- Nunca inventar cifras, usuarios, resultados, testimonios ni pantallas.
- No decir que LigaLab está disponible públicamente si no lo está.
- Sí se puede decir «estamos construyendo», «estoy preparando» o equivalente cuando sea cierto.
- Una función existente puede aparecer como teaser, pero sin fingir que cualquiera puede usarla hoy.
- Seedance/modelos visuales no generan UI legible de LigaLab.
- Logo/app icon son reemplazables.

## Estado
`pending_approval` solo si marca, Product Truth y hechos pasan. Si no, `blocked`.

## Límites
- No generar el vídeo final salvo petición explícita separada.
- No publicar externamente sin aprobación humana.
- No cambiar UI, lógica ni datos de LigaLab.
