# LigaLab — Production Priority

## Objetivo
Convertir la cola editorial en producción constante sin esperar a que la app esté terminada.

## Orden recomendado
1. LL-2026-004 — cerrar Canva y pasar a `design_ready`.
2. LL-2026-005 — producir visual siguiendo el handoff ya preparado.
3. LL-2026-006 — producir visual.
4. LL-2026-011 — nuevo evergreen sobre valor de equipo vs capacidad real de puja.
5. LL-2026-012 — nuevo evergreen sobre coste de oportunidad tras fichar.
6. LL-2026-013 — nuevo evergreen sobre precio del jugador vs contexto de puja.
7. LL-2026-014 — build in public real, sin enseñar pantallas no terminadas.
8. LL-2026-015 — dilema evergreen sobre falsas oportunidades.

## Cadencia sugerida de producción
- Mantener siempre 5 piezas en estado `pending_approval` o mejor.
- Mantener al menos 3 piezas en `design_ready`.
- No producir más de 2 piezas casi idénticas en la misma serie seguida.
- Mezcla objetivo: 2 evergreen competitivos + 1 educación + 1 build in public por cada 4 piezas.

## Gate de publicación
Una pieza solo puede pasar a `ready_to_publish` cuando tenga:
- script final
- visual final o vídeo final
- caption final
- portada
- QA de marca
- QA factual
- `needs_capture=false` o captura real ya insertada
- estado prelaunch correcto

## Lo que no debe bloquear producción
- app no publicada
- ausencia de screenshot para piezas conceptuales
- ausencia de Radar en evergreen

## Lo que sí bloquea
- claim de producto no confirmado
- cifra sin fuente
- UI inventada
- actualidad sin evidencia
- falsa disponibilidad pública
