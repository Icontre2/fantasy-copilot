# LL-2026-002 — reset creativo

## Estado
Preparado para producción de assets. No publicar.

## Concepto validado
**Castigo real → LigaLab real.**

No partir de un hook inventado. El primer beat es un vídeo de un castigo real/permitido asociado a perder una liga entre amigos. El único texto superior validado es:

**para que no te pase esto**

No añadir emojis, jerga, explicación ni remate por defecto.

## Storyboard
### Beat 1 — castigo
- Formato vertical 9:16.
- Usar un vídeo cuyo interés visual funcione sin contexto adicional.
- Debe existir permiso/licencia clara para reutilizarlo; si no, no entra en producción.
- Overlay superior: `para que no te pase esto`.
- No afirmar que el vídeo pertenece a una liga Fantasy salvo que la fuente lo confirme.

### Beat 2 — LigaLab
- Corte directo a screen recording REAL de LigaLab.
- No recrear interfaz, cifras, nombres, saldos, notificaciones ni estados.
- Mostrar una única acción real, no un tour de producto.

## Pantalla candidata para el beat 2
Primera candidata: **Alertas de cláusula**, porque PRODUCT_TRUTH confirma que hoy muestra hueco hasta cláusula, subida media diaria, días estimados, blindaje y cuándo puede ficharse. Es una ventaja concreta y visualmente demostrable.

Alternativa si la grabación no se entiende rápido: **caja de rivales reconstruida**, manteniendo visible el `≈` cuando sea estimada. No presentarla como cifra exacta.

No usar push/alertas automáticas: están apagadas en producción.

## Assets necesarios
1. Vídeo de castigo con derechos/permiso verificables.
2. Screen recording real de 2–4 s de una de las pantallas candidatas.
3. Logo/wordmark existente solo si hace falta cierre; no es obligatorio.

## Bloqueos
- `castigo_asset`: pendiente de fuente con derechos claros.
- `product_capture`: pendiente, pero ya está definido qué pantallas reales son válidas.

## QA antes de diseño
- [ ] El castigo funciona visualmente sin copy adicional.
- [ ] La licencia/permiso del vídeo está documentada.
- [ ] Solo aparece `para que no te pase esto` en el primer beat, salvo aprobación humana posterior.
- [ ] La captura de LigaLab es real.
- [ ] La función mostrada figura en `PRODUCT_TRUTH.md` → Funciona hoy.
- [ ] Si aparece caja rival, el `≈` no se oculta.
- [ ] No se muestra ni se afirma push automático.
- [ ] No hay CTA de descarga/disponibilidad pública inventado.
