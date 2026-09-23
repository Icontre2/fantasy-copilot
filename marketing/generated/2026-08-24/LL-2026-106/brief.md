# LL-2026-106 — Comparador, visual-first

## Concepto
Mostrar una decisión real de Fantasy comparando dos jugadores dentro de LigaLab. La pieza debe funcionar como demostración visual: dos fichas, una comparación y el espectador entiende que puede mirar los datos antes de decidir.

## Beat visual
1. 0–2 s: abrir directamente en CompareView con dos jugadores reales.
2. 2–5 s: recorrer valor, cláusula, media, puntos, propietario y evolución que aparecen en la comparación.
3. 5–7 s: detenerse en una diferencia visible de la comparación.
4. 7–8 s: firma discreta «LigaLab · en construcción», solo si encaja.

## Texto
No requiere hook textual. Si edición necesita contexto, usar únicamente la etiqueta funcional «Comparador».

## Producto demostrado
Comparador: dos jugadores con valor, cláusula, media, puntos, propietario y evolución.

## Requisitos
- Captura REAL de CompareView.
- Usar solo jugadores, nombres e importes que aparezcan realmente en la captura.
- No elegir una conclusión de fichaje que la herramienta no emita.
- No convertir la comparación en recomendación o predicción.
- No publicar externamente.

## Diferenciación frente a la cola
No reutiliza mercado + caja rival de LL-2026-016 ni economía manager-a-manager de LL-2026-105. El objeto visual es exclusivamente la comparación directa de dos jugadores.
