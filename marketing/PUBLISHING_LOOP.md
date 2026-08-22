# LigaLab — Publishing Loop

## Objetivo
Mantener una cola mínima de 10 piezas prelaunch listas o casi listas sin depender de que la app esté terminada.

## Bucle
1. Leer `editorial-queue.json`.
2. Si hay menos de 10 piezas activas, crear una evergreen nueva que no duplique ángulo.
3. Completar siempre los 7 archivos del paquete.
4. Revisar Brand + Product Truth + Facts.
5. Si no necesita producto real, `needs_capture=false`.
6. Si necesita demostrar producto, usar captura real y `needs_capture=true`.
7. Llevar la siguiente pieza a diseño cuando haya capacidad.
8. Tras publicar manualmente, registrar URL y métricas a 24h, 72h y 7d.
9. Convertir aprendizajes en nuevos hooks, no en copias literales.

## Prioridad
- 70% evergreen/pain/dilemas
- 20% actualidad con evidencia
- 10% build in public/producto

## Guardrail
No publicar automáticamente, no inventar métricas, no falsear UI y no afirmar disponibilidad pública antes del lanzamiento.
