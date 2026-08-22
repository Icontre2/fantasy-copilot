# QA — LL-20260822-003

**Veredicto final: `PASS`. Autocorrección usada: 1 de 1.**

Esta pieza es la primera que recorre el camino completo `FIX` → autocorrección →
nueva revisión → `PASS`. No quedan vueltas: un tercer veredicto negativo la
habría dejado en `blocked`.

## Primera revisión: `FIX`

Ninguno de los cinco cambios era de verdad — los cuatro encargos de verificación
salieron limpios a la primera:

| Encargo | Resultado |
| --- | --- |
| Once probable y Comparador en «Funciona hoy» | Sí, `PRODUCT_TRUTH.md:48` y `:52`. Nada de §2 ni §3 presentado como presente |
| Sin insinuar detección de bajas | Correcto. El guion abre desactivando el riesgo: «Las bajas ya las sabes» |
| Maffeo no como suplencia cerrada | No aparece: la pieza no nombra club ni jugador |
| Sin recomendación de alineación | Correcto. «Decides tú. Nosotros te enseñamos la cuenta» |

Lo que falló fue **craft y datado**:

1. **96 palabras para 23 s** — unas 250 ppm, inviable en locución española.
2. **Frase de 25 palabras**, contra la regla de frases breves de `VOICE.md`.
3. **El sello «AS · fecha» iba atado al reloj de publicación.** Si la pieza salía
   el 23, desdataba la fuente.
4. **Corte del beat 3 al 4** insinuaba que la captura era el once del caso,
   siendo de otro equipo.
5. **Riesgo semántico abierto** en montaje: nada impedía que un editor colara
   «avisa» o «detecta».

## Qué se cambió

1. Guion a **70 palabras** (~161 ppm) y frase larga partida en dos de 8 y 11.
2. Sello **fijo** en `AS · 22 ago 2026`, atado al artículo.
3. **Rótulo puente nuevo** (beat 4): «Así se ve en LigaLab, con cualquier
   equipo». El Reviewer lo consideró mejor que lo que él había pedido: no solo
   separa, declara.
4. Restricción semántica anotada **en la pieza**, no solo en la revisión, para
   que sobreviva al siguiente editor.
5. Duración a **26 s** y 9 beats, ~2,9 s por rótulo.

## Un aviso que NO se aceptó

El Reviewer pidió que el CTA recordase que LigaLab requiere cuenta de LALIGA
Fantasy y estar en una liga. **Se rechazó con motivo**: un CTA de 15 segundos que
además explica el requisito de cuenta deja de ser un CTA. Se registró como aviso
de QA para quien apruebe.

El Reviewer lo aceptó en la segunda vuelta: *«Tienes razón y no lo mantengo como
exigencia. La limitación 1 es un problema de conversión, no de veracidad»*.

## Avisos abiertos para quien apruebe

- El CTA no menciona el requisito de cuenta (arriba).
- El once probable depende de raspar a FútbolFantasy (§4): si esa fuente cae, la
  función que demuestran los beats 5-6 cae con ella.
- **Caduca a las 48 h del 22 ago 2026.**

## Antes de grabar

1. Confirmar que no ha salido una quinta baja o una recuperación que invalide el
   escenario.
2. Comprobar que los porcentajes de titularidad ya reflejan la situación. Si
   salen sin actualizar o como `?`, la pieza cambia de ángulo o no sale: no se
   puede enseñar una pantalla que contradiga la noticia que estás citando.
3. Comprobar si la UI muestra escudos o avatares fotográficos de forma
   inevitable. Si es así, los beats 6-8 hay que replantearlos.
4. Grabar **un equipo distinto** al del caso.

## Antes de publicar

Aprobación humana en `/marketing`. Nada se publica solo.
