# LL-2026-002 — Claim risk review

## Dirección creativa preservada
Mantener exactamente la dirección validada:

**castigo real → “para que no te pase esto” → captura REAL de LigaLab**

No reescribir el hook ni añadir jerga/remates.

## Riesgo detectado
El contraste castigo → producto puede leerse como una promesa causal de resultado (“usar LigaLab evita quedar último / te hace ganar”). PRODUCT_TRUTH prohíbe prometer resultados y no existe evidencia de que LigaLab evite quedar último.

## Guardrail obligatorio de montaje
La pieza puede seguir adelante siempre que el montaje no añada ninguna afirmación que convierta el gag en claim de rendimiento.

### Permitido
- El texto validado “para que no te pase esto”.
- Mostrar una función que funciona hoy mediante captura real.
- Mostrar Alertas de cláusula como información disponible hoy.
- Mostrar caja de rivales solo manteniendo `≈` cuando sea estimada.
- Cierre neutro de marca o prelaunch.

### No permitido
- “evita quedar último”
- “gana tu liga” / “gana a tus amigos” como promesa de resultado
- “no volverás a perder”
- “con LigaLab esto no te pasa”
- “te salva la jornada”
- cualquier porcentaje/cifra de mejora
- simular alertas push o avisos automáticos
- recrear UI o datos inexistentes

## Selección de pantalla
**Opción preferida: Alertas de cláusula**
- Es una función verificada en PRODUCT_TRUTH.
- Debe mostrarse como consulta dentro de la app; no insinuar que la app envía push o avisa sola.

**Alternativa: caja de rivales**
- Solo si la captura real es legible en 2–4 s.
- Mantener el símbolo `≈` y cualquier explicación de estimación visible si forma parte de la pantalla.

## Gate antes de brand_review
- [ ] vídeo de castigo con derechos/permiso comercial claros
- [ ] captura real de LigaLab de 2–4 s
- [ ] ninguna promesa explícita de victoria/posición final
- [ ] ninguna función apagada o futura presentada como actual
- [ ] datos/estimaciones representados como aparecen en producto
- [ ] la pieza funciona como gag + demostración, no como testimonial de resultado

Si cualquiera falla, mantener `status=draft`.
