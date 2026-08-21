# LigaLab Creative Factory

## Objetivo
Convertir oportunidades verificables en paquetes creativos listos para revisión humana, sin publicar automáticamente.

## Inputs obligatorios
- `brand/BRAND.md`
- `brand/VOICE.md`
- `brand/CONTENT_RULES.md`
- `marketing/PRODUCT_TRUTH.md`
- `marketing/CONTENT_ENGINE.md`
- radar del día, si existe

## Producción diaria
Seleccionar 1 insight fuerte por defecto y un máximo absoluto de 3 oportunidades. Calidad > volumen.

## Flujo
1. Radar: detectar conversación, dolor o ángulo relevante.
2. Product Truth: descartar cualquier idea que requiera una función no disponible.
3. Insight: formular una sola verdad útil.
4. Hooks: crear 3 y escoger el más claro.
5. Package: adaptar el insight a vídeo corto, carrusel/X/Story según encaje.
6. Assets: indicar qué es captura real y qué puede generarse.
7. Brand Reviewer: comprobar identidad, voz y tratamiento de capturas.
8. Fact Reviewer: comprobar cada afirmación contra PRODUCT_TRUTH y la fuente del radar.
9. Estado final: `pending_approval` si pasa; `blocked` si falta evidencia.

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
No existe transición automática a publicado.
