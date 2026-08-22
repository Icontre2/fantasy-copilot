# Imagen — LL-20260822-004

## Concepto

Un carrusel que enseña una **cuenta**, no un aviso. Avanza como se avanza en una
operación: primero el error de lectura (el precio de hoy), luego los dos
operandos, luego el resultado siempre atado a su condición, y solo entonces el
producto real.

La metáfora rechaza **deliberadamente** el reloj, la cuenta atrás y el semáforo:
los tres convierten una estimación en un evento. Aquí no hay tictac, hay una
operación que cualquiera podía haber hecho y nadie hizo.

El «hueco» se dibuja como espacio negativo entre dos bloques tipográficos, **no**
como una barra de progreso llenándose — eso volvería a insinuar inevitabilidad.

## Prompt de las capas generadas

```
Carrusel vertical 1080x1350, ocho slides. Base neutra #08070a → #050506 en
degradado plano, sin manchas de luz y en particular sin ningún halo morado: el
morado no existe fuera de las capturas reales.

Acento rojo de marca LigaLab, un solo énfasis por slide. Tipografía Sora con
figuras TABULARES en todo dato numérico.

Línea roja horizontal de 2 px a la misma altura Y en los ocho slides, para que
al deslizar no salte. Filete rojo de 2 px alrededor de toda captura real, y
SOLO alrededor de capturas reales.

PROHIBIDO generar interfaz de aplicación: sin barra de estado, pestañas,
botones ni chrome de app en los slides generados. Prohibidos además escudos,
logo de LALIGA, fotos de prensa, y cualquier glifo de notificación — campanas,
badges, puntos rojos, marcos de móvil con push.
```

## El hex del rojo no se inventa

`BRAND.md:17` nombra el «Rojo LigaLab» pero **no lo fija**, y no está en ninguna
parte del repositorio. Se pide por su nombre y se usa el valor aprobado por
identidad. No se cuentagotea de una pieza anterior ni se elige un rojo plausible:
así es como se acaba con tres rojos distintos conviviendo.

## Dos reglas de composición que no son estéticas

**El filete rojo solo rodea capturas reales.** Si un slide no lleva captura, no
lleva filete. Es lo que le dice al espectador «esto es la app de verdad»; usarlo
de adorno lo destruye como señal.

**El slide 5 lleva una caja de filete rojo que no rodea una captura.** Es la
única excepción y es intencionada: es lo que ata la condicional al número. No se
elimina por coherencia formal.

## La píldora EJEMPLO

Reservada **exclusivamente** a cifras inventadas, en los slides 4 y 5. No se usa
en ningún otro contexto, para que no pierda significado. Sin ella, el slide 4 es
un mockup falso de LigaLab — exactamente lo que prohíbe `IMAGE_PIPELINE.md` §5.

## Portada

Slide 1. Es el único que sostiene la pieza entera **sin contener una sola cifra**,
así que nada en él se puede malinterpretar como dato de producto ni como
predicción.

Descartados como portada: el slide 4 (cifras de ejemplo, que fuera de contexto
parecerían datos reales) y sobre todo **el slide 5**, que es el frame que esta
pieza tiene más probabilidades de convertir en predicción si se aísla. Si hace
falta un segundo frame para preview, el slide 3 — visualmente distintivo y
numéricamente mudo.

## Handoff a Canva

1080×1350, ocho páginas.

- Monta primero una **página maestra** con la línea roja de firma y la firma
  LigaLab en la esquina, y duplícala ocho veces: así la línea queda garantizada a
  la misma Y.
- Sora subida como fuente de marca si la cuenta no la tiene — **no** se sustituye
  por una geométrica parecida. Figuras tabulares activadas.
- Las capturas se colocan **sin ningún filtro**, sin ajuste de brillo,
  saturación o temperatura, y sin la corrección automática que Canva aplica a
  veces al importar: compruébalo.
- El filete se hace con un rectángulo de borde 2 px por encima, nunca con el
  borde nativo de la imagen si eso implica recortarla.
- Exportar PNG, ocho archivos numerados 01-08, sin compresión agresiva.
- **Nada de la biblioteca de Canva**: ni iconos, ni ilustraciones, ni gráficas, y
  bajo ninguna circunstancia campanas, badges, puntos rojos de notificación o
  marcos de móvil con push.
