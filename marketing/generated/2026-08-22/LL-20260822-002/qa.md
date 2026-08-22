# QA — LL-20260822-002

**Veredicto del Brand Reviewer: `PASS`.** Sin problemas mayores, sin cambios
obligatorios, sin autocorrección (0 de 1 disponible usada).

## Claims verificados contra PRODUCT_TRUTH

| Claim | Evidencia | Resultado |
| --- | --- | --- |
| 100 M€ de presupuesto inicial | `PRODUCT_TRUTH.md:45`, §1 «Funciona hoy» | Verificado |
| LALIGA publica el saldo propio, exacto | `PRODUCT_TRUTH.md:46` | Verificado |
| Método = 100 M€ + operaciones + puntos | `PRODUCT_TRUTH.md:45`, `economy/activity.ts` | Verificado |
| La app explica el método en pantalla hoy | `PRODUCT_TRUTH.md:62` | Verificado |
| Hueco + blindaje + fecha en cláusulas | `PRODUCT_TRUTH.md:43` (`AlertsView`) | Verificado |

Ninguno cae en §2 («construido pero APAGADO»). Comprobado en concreto que la
pieza no toca push, cron ni «te avisa sola»: `AlertsView` es una vista
consultable, no un automatismo, y el guion nunca dice que avise sola.

## Corregido antes de escribir la pieza

Dos avisos menores del Reviewer se aplicaron en vez de dejarlos anotados:

- **Adyacencia imprecisa.** «Al lado, jugador por jugador…» sugería que el hueco
  hasta la cláusula vive en la misma pantalla que la caja del rival. Son dos
  sitios (`:45,51` y `:43`). El guion nombra ahora la vista de cláusulas por
  separado.
- **Absoluto de más.** «no lo ves en ningún sitio» era más rotundo que
  `PRODUCT_TRUTH.md:173` («la caja ajena es estimación salvo que LALIGA la
  publique»). Sustituido por «no lo tienes a mano», en guion y en la slide 4.

## Avisos que quedan abiertos

- **Inconsistencia documental de color.** `IMAGE_PIPELINE.md` §3-§4 pide morado;
  la pieza usa rojo por `CONTENT_RULES.md:12` y `BRAND.md:17`. La decisión no
  vulnera ninguna norma, pero el pipeline debería arreglarse.
- **Densidad de la frase del método.** Roza `VOICE.md:11` (frases breves en
  móvil). Se acepta: es justo la frase que sostiene el `≈`.
- **El PASS es condicional a las capturas.** Si la captura del método no muestra
  la explicación en pantalla, este PASS decae y la pieza vuelve a revisión.
- **Bloqueo §0 de PRODUCT_TRUTH** (uso comercial sin autorización escrita de
  LALIGA): no afecta al contenido, sí a cualquier campaña de pago.

## Antes de publicar

1. Conseguir las tres capturas reales descritas en `captureRequest`.
2. Comprobar que ninguna deja ver datos identificables de managers reales.
3. Aprobación humana en `/marketing`. Nada se publica solo.
