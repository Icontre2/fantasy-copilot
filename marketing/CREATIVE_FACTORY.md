# LigaLab Creative Factory

## Objetivo
Convertir oportunidades verificables en paquetes creativos listos para revisión humana, sin publicar automáticamente y sin encadenar agentes rígidos.

## Modelo operativo
La fábrica funciona con una única pasada coordinada por un Orchestrator. Los documentos de `agents/` son criterios especializados que el Orchestrator consulta cuando aportan valor; no son gates secuenciales obligatorios.

## Inputs obligatorios
- `brand/BRAND.md`
- `brand/VOICE.md`
- `brand/CONTENT_RULES.md`
- `marketing/PRODUCT_TRUTH.md`
- `marketing/CONTENT_ENGINE.md`
- `marketing/automation.config.json`
- `marketing/radar/YYYY-MM-DD.json`

## Producción diaria
1. Validar que el Radar JSON existe y es válido. Si no, bloquear sin inventar oportunidades.
2. Ordenar oportunidades por score.
3. Aplicar `minimumScoreForCreative`.
4. Crear por defecto solo la mejor pieza si es suficientemente fuerte.
5. Procesar como máximo 3 si realmente hay tres oportunidades excepcionales y distintas.

## Orquestación
El Orchestrator resuelve en una sola pasada:
- estrategia y ángulo;
- hooks y copy;
- concepto visual;
- especificación de vídeo solo cuando el formato lo necesita;
- product truth y fact check;
- revisión de marca.

No debe detener el flujo por una corrección menor. Si Reviewer detecta un problema corregible, el Orchestrator hace una única autocorrección y vuelve a revisar. Solo queda `blocked` cuando persiste un problema real de evidencia, product truth, datos, privacidad o integridad de producto.

## Archivos por oportunidad
`marketing/generated/YYYY-MM-DD/<contentId>/`
- `brief.md`
- `package.json`
- `script.md`
- `seedance-prompt.md`
- `image-prompt.md`
- `captions.md`
- `qa.md`

## Reglas de producto y assets
- Nunca inventar cifras, pantallas, usuarios, resultados o testimonios.
- Una captura real jamás se recolorea, reconstruye ni rediseña.
- El framing de marketing sí puede envolver una captura real.
- Si la pieza demuestra una función de la app, marcar `needs_capture=true` hasta tener la captura real.
- Seedance o cualquier modelo visual no debe generar UI falsa legible de LigaLab.
- Logo y app icon se consideran reemplazables.

## Revisión
Una pieza pasa a `pending_approval` solo si:
- Brand Review: pass.
- Product Truth: pass.
- Fact check: pass.
- No hay pantalla inventada.

Si falla algo corregible, autocorregir una vez. Si sigue fallando, `blocked` con motivo concreto.

## Límites
- No generar el vídeo final.
- No publicar externamente.
- No cambiar UI, lógica ni datos de LigaLab.
- No convertir los agentes en dependencias que se esperan entre sí.
