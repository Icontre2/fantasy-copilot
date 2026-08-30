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
- referencias creativas observables registradas en `marketing/research/`

## Producción diaria
Seleccionar 1 insight fuerte por defecto y un máximo absoluto de 3 oportunidades. Calidad > volumen.

## Biblioteca visual prioritaria

La creatividad de LigaLab debe ser **visual-first**: primero se decide qué imagen,
movimiento o dato detiene el scroll y después se escribe el mínimo texto necesario.
Las referencias aportadas por el usuario muestran una preferencia clara por
composiciones deportivas editoriales, jugador protagonista, titulares enormes y
gráficos de movimiento. Se usan como aprendizaje de estructura, no como identidad
a copiar.

Formatos que el sistema debe reconocer y reutilizar cuando la evidencia los soporte:

| Formato | Trigger | Estructura visual |
| --- | --- | --- |
| `market_risers` | Variaciones positivas verificadas | Portada/hook → ranking de subidas → CTA/contexto |
| `market_fallers` | Variaciones negativas verificadas | Portada/hook → ranking de bajadas → contexto |
| `must_buy` | Un jugador destaca por señales verificables | Jugador protagonista → dato/razón principal → evidencia |
| `value_pick` | Diferencia de valor/precio respaldada | Jugador + comparación visual → dato → conclusión |
| `fantasy_alert` | Cambio relevante con evidencia | Señal visual de alerta → jugador → qué cambió |

Reglas comunes:
- 9:16 primero.
- Una sola idea por pieza.
- El jugador o dato protagonista debe dominar la composición cuando sea pertinente.
- Tipografía grande y legible a tamaño móvil.
- Verde = crecimiento/oportunidad; rojo = caída/riesgo.
- Flechas, barras, gráficos y efectos solo si explican el dato.
- No usar texto para describir lo que la imagen ya comunica.
- No convertir el contenido en un dashboard vertical.
- Nunca inventar cifras, fotos, pantallas o contexto para completar una composición.
- Si la pieza depende de una pantalla del producto, usar `real_app_capture` y mantener
  `needsCapture=true` hasta disponer de la captura real.

## Salud real de la cola
No usar el número bruto de IDs de `marketing/editorial-queue.json` para decidir si hay backlog suficiente.

Contar como **pieza utilizable para backlog** solo una entrada que:
- no tenga `status: rejected`;
- no incluya `REWRITE REQUIRED` en `note`;
- no contradiga feedback humano vigente;
- tenga una dirección creativa todavía válida, aunque esté en `draft` por un asset/captura pendiente.

Una pieza bloqueada únicamente por asset real sí cuenta como backlog utilizable si el concepto ya está validado y el bloqueo está especificado. Una pieza heredada que necesita replanteamiento creativo no cuenta.

**Umbral operativo:** mantener al menos 10 piezas utilizables. Si el conteo real baja de 10, el loop debe intentar reponer backlog con nuevas oportunidades evergreen o referencias válidas, pero nunca saltarse el Feedback Gate ni el Creative Reset para llenar el número artificialmente. Si no hay evidencia/referencias suficientes para crear algo digno, registrar el déficit y trabajar sobre el bloqueo en vez de generar copy de relleno.

Siempre que se actualice la cola, mantener un resumen `queueHealth` con al menos:
- `totalIds`
- `usableBacklog`
- `rejected`
- `rewriteRequired`
- `targetUsableBacklog`
- `deficit`

## Feedback humano manda
El feedback explícito del usuario invalida cualquier score o estado anterior de una pieza.

Estado actual (2026-08-22): los hooks/copies generados recientemente han sido rechazados por sonar escritos, artificiales y poco nativos de TikTok. **No seguir escalando esa línea creativa ni generar variaciones cosméticas de los mismos hooks.**

Hasta disponer de evidencia creativa mejor:
- no promover automáticamente una pieza a diseño solo porque cumple estructura;
- no inventar jerga juvenil ni intentar “sonar Gen Z”;
- no obligar al texto a explicar la historia si el vídeo puede hacerlo;
- priorizar investigación de referencias reales, observación de formatos y estructura visual antes de redactar nuevos hooks;
- si una pieza heredada usa el enfoque rechazado, mantenerla en `draft` con una nota `REWRITE REQUIRED`; si la dirección fue rechazada explícitamente por revisión humana, usar `rejected`;
- una frase corta no es automáticamente TikTok-native.

## Evidencia creativa reciente
`marketing/research/tiktok-creative-references-2026-08-23.md` registra evidencia de TikTok for Business y Newsroom. La búsqueda directa de TikTok para ejemplos específicos de LALIGA Fantasy está bloqueada por robots.txt en la ejecución del 2026-08-23; por tanto, no se deben inventar ejemplos de creadores, vídeos o lenguaje específico de Fantasy. Estas fuentes sirven para validar principios de producción y autenticidad, no para fabricar hooks.

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
11. Estado final de esta fase: `pending_approval` si pasa brand + fact review. Si falta evidencia, captura o asset, conservar `draft` y describir el bloqueo en `note`. Si contradice feedback humano de forma explícita, usar `rejected`.

## Filtro anti-copy-artificial
Antes de pasar a diseño, responder:
- ¿La idea funciona visualmente aunque quitemos la mayor parte del texto?
- ¿Estamos describiendo una situación real o escribiendo una frase publicitaria disfrazada de meme?
- ¿El lenguaje procede de referencias observadas o nos lo estamos inventando?
- ¿Es una variación de una dirección que el usuario ya rechazó?

Si la última respuesta es sí, detener la pieza: `rejected` si la dirección ya fue rechazada explícitamente; en caso contrario mantener `draft` con `REWRITE REQUIRED` en `note`.

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
- Si la demostración depende de la UI: `needs_capture=true` en los metadatos de la pieza; el estado sigue siendo `draft` mientras falte esa captura.
- Seedance y generación de imagen no deben inventar cifras legibles ni pantallas falsas de LigaLab.
- Un bloqueo de asset no crea un estado nuevo: se documenta en `note`.

## Estados — fuente única
La fuente de verdad es `marketing/automation.config.json`.

Estados válidos:
`radar` → `draft` → `brand_review` → `fact_review` → `pending_approval` → `approved` → `generated` → `published`.

También existe `rejected` para direcciones descartadas explícitamente.

No usar como estados: `needs_rewrite`, `capture_needed`, `blocked`, `design_ready`, `design_draft` ni otros valores ad hoc. Esos conceptos se expresan mediante `note`, flags como `needsCapture` y archivos de QA/asset plan.

No existe transición automática a `generated` o `published`: requieren aprobación humana según `automation.config.json`, y los publishers permanecen desactivados mientras `publishersEnabled=false`.
