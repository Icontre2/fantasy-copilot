# LL-2026-111 — PAGAR CLÁUSULA

## Tipo
Evergreen visual-first · prelaunch

## Concepto
Demostrar con producto real que LigaLab permite ejecutar el pago de una cláusula desde la tarjeta del jugador, con confirmación explícita de la cifra antes de ejecutar.

## Por qué entra en la fábrica
Es una capacidad verificada en producción y distinta de los conceptos ya presentes en la cola: no es análisis de caja, comparador, evolución, economía, calendario, once probable ni puntos por jornada. La pieza puede funcionar como demostración directa sin depender de un hook publicitario.

## Estructura visual
1. Abrir directamente en la tarjeta real de un jugador donde exista la acción de pagar cláusula.
2. Mostrar el paso de confirmación de la cifra.
3. Cortar antes de ejecutar el pago o, si se graba una operación real autorizada, documentar claramente que es una cuenta de prueba/acción permitida.
4. Cierre breve identificando LigaLab en construcción.

## Texto
No requiere hook. Si hace falta overlay, usar únicamente un descriptor neutral como «Pagar cláusula».
No añadir promesas de éxito, ahorro, ventaja garantizada o disponibilidad pública.

## Asset requerido
`needsCapture=true`.
Grabación REAL de LigaLab en vertical. No recrear UI, no editar cifras/nombres y no simular una operación.

## QA
- Verificar que la función sigue activa en producción antes de capturar.
- No mostrar credenciales, datos personales ni información de terceros no necesaria.
- No ejecutar una cláusula real sin autorización explícita; una demo puede detenerse en la pantalla de confirmación.
- No presentar la caja de un rival como exacta.
- No insinuar afiliación con LALIGA.
- Mantener publishers desactivados y aprobación humana requerida.
