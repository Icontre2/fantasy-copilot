# LigaLab Creative Factory

## Objetivo
Convertir oportunidades verificables en paquetes creativos listos para revisión humana, sin publicar automáticamente.

## Inputs obligatorios
- `brand/BRAND.md`
- `brand/VOICE.md`
- `brand/CONTENT_RULES.md`
- `marketing/PRODUCT_TRUTH.md`
- `marketing/CONTENT_ENGINE.md`
- feedback humano más reciente sobre copies/creatividad
- radar del día, si existe

## Producción diaria
Seleccionar 1 insight fuerte por defecto y un máximo absoluto de 3 oportunidades. Calidad > volumen.

## Feedback humano manda
El feedback explícito del usuario invalida cualquier score o estado anterior de una pieza.

Estado actual (2026-08-22): los hooks/copies generados recientemente han sido rechazados por sonar escritos, artificiales y poco nativos de TikTok. **No seguir escalando esa línea creativa ni generar variaciones cosméticas de los mismos hooks.**

Hasta disponer de evidencia creativa mejor:
- no promover automáticamente una pieza de `idea_scored`/`pending_approval` a diseño solo porque cumple estructura;
- no inventar jerga juvenil ni intentar “sonar Gen Z”;
- no obligar al texto a explicar la historia si el vídeo puede hacerlo;
- priorizar investigación de referencias reales, observación de formatos y estructura visual antes de redactar nuevos hooks;
- si una pieza heredada usa el enfoque rechazado, marcarla `needs_rewrite` en vez de pulirla incrementalmente;
- una frase corta no es automáticamente TikTok-native.

## Flujo
1. Feedback gate: comprobar que el concepto no repite una dirección rechazada.
2. Radar/referencias: detectar conversación, dolor, formato o ángulo relevante.
3. Product Truth: descartar cualquier idea que requiera una función no disponible.
4. Insight: formular una sola verdad útil.
5. Concepto visual: decidir qué hace parar el scroll antes de escribir copy.
6. Texto mínimo: solo el necesario para que el concepto se entienda; no explicar por sistema.
7. Package: adaptar el insight a vídeo corto, carrusel/X/Story según encaje.
8. Assets: indicar qué es captura real y qué puede generarse.
9. Brand Reviewer: comprobar identidad, voz, feedback humano y tratamiento de capturas.
10. Fact Reviewer: comprobar cada afirmación contra PRODUCT_TRUTH y la fuente del radar.
11. Estado final: `pending_approval` si pasa; `blocked`/`needs_rewrite` si falta evidencia o contradice feedback.

## Filtro anti-copy-artificial
Antes de pasar a diseño, responder:
- ¿La idea funciona visualmente aunque quitemos la mayor parte del texto?
- ¿Estamos describiendo una situación real o escribiendo una frase publicitaria disfrazada de meme?
- ¿El lenguaje procede de referencias observadas o nos lo estamos inventando?
- ¿Es una variación de una dirección que el usuario ya rechazó?

Si la última respuesta es sí, detener la pieza y marcar `needs_rewrite`.

## Archivos por oportunidad
`marketing/generated/YYYY-MM-DD/LL-YYYY-NNN/`
- `brief.md`
- `package.json`
- `script.md`
- `seedance-prompt.md`
- `image-prompt.md`
- `captions.md`
- `qa.md`

## Reglas de assets
- Captura real: jamás recrear la interfaz fingiendo que es producto real.
- Marketing visual: sí puede usar rojo, fondos, tipografía, personas y framing alrededor de la captura.
- Si la demostración depende de la UI: `needs_capture=true`.
- Seedance y generación de imagen no deben inventar cifras legibles ni pantallas falsas de LigaLab.

## Estados
`draft` → `brand_review` → `fact_review` → `pending_approval`.
También: `needs_rewrite`, `capture_needed`, `blocked`, `design_ready`, `design_draft`.
No existe transición automática a publicado.
