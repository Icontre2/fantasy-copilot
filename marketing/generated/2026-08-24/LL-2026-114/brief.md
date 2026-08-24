# LL-2026-114 — Mercado / pujas reales

## Objetivo
Evergreen visual-first que demuestra una función real de LigaLab sin empezar por un copy publicitario.

## Concepto
Abrir directamente con una pantalla REAL del mercado de LigaLab: un jugador que esté actualmente en mercado y la información/controles de puja que existan en producción. El interés debe venir de ver la decisión, no de una frase inventada.

## Producto que puede mostrarse
`PRODUCT_TRUTH.md` confirma `MarketView` y `/market/[id]/bid`: crear, modificar y cancelar puja, con filtros por posición/procedencia y ordenaciones.

## Asset obligatorio
`needsCapture=true`.
Grabar 5–8 s verticales de la experiencia real para seleccionar un corte de 2–4 s. Usar datos reales de la sesión; no sustituir nombres, cantidades, jugador ni estado de mercado.

## Texto
Opcional y mínimo. Si la pantalla se entiende sola, no añadir hook. Si hace falta etiqueta neutral, usar `Mercado`.

## Prohibiciones
- No inventar jugador, puja, cantidad o estado del mercado.
- No presentar una puja como recomendación de LigaLab.
- No recrear UI.
- No alterar cifras reales para hacerlas más llamativas.
- No usar promesas de ganar, ahorrar o acertar.
- No publicar externamente.

## QA previo a revisión humana
- Captura pertenece a LigaLab real.
- Datos legibles y sin terceros identificables fuera de lo necesario.
- La función mostrada coincide con `PRODUCT_TRUTH.md`.
- No hay claim de recomendación ni predicción.
- El vídeo funciona visualmente sin explicación larga.
