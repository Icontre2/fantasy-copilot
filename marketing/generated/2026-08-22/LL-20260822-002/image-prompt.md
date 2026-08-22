# Prompt de imagen — LL-20260822-002

## Decisión de color: rojo, no morado

`marketing/IMAGE_PIPELINE.md` §3-§4 pide acento morado `#8b5cf6` «heredado del
producto». Esta pieza usa el **rojo de marca**, y el morado solo aparece dentro
de la captura real, intacto. Tres razones:

1. `brand/CONTENT_RULES.md:12` y `brand/BRAND.md:17` son norma de marca; el
   prompt del pipeline es un artefacto operativo subordinado.
2. El objetivo del pipeline —que la gente reconozca la app antes de instalarla—
   se cumple mejor enseñando la app real que imitando su paleta en arte generado.
3. Si el arte generado usa el morado del producto, el espectador deja de
   distinguir lo generado de la UI real. El rojo funciona como frontera
   semántica: **rojo = marketing, morado = producto real.**

Del pipeline se conserva todo lo que no está en conflicto: fondo `#08070a` →
`#050506`, Sora, cifras tabulares, y la prohibición de escudos, logo de LALIGA
y fotos de prensa.

> **Resuelto en el repo.** `IMAGE_PIPELINE.md` §3-§4 ya separa las dos paletas:
> el arte generado va en rojo de marca y el morado queda como paleta del
> producto, solo visible dentro de una captura real. Su prompt base incorpora
> además la prohibición de generar interfaz, que antes vivía únicamente en la
> prosa del §5 — y un modelo no lee el §5.
> `src/server/marketing/docs-de-marca.test.ts` falla si alguien lo revierte.

## Prompt base

```
Carrusel vertical 1080x1350 para redes, tema oscuro casi negro (#08070a a
#050506), degradado muy plano y SIN manchas de luz de color. Acento rojo de
marca LigaLab, un solo énfasis por slide. Tipografía geométrica sans estilo
Sora, muy marcada; cifras tabulares. Estética editorial de app financiera
premium, vidrio esmerilado sobre fondo oscuro, composición limpia con mucho
aire y jerarquía clara. Una línea roja de 4 px avanza un octavo por slide como
barra de progreso y firma.

Sin logos de marcas reales, sin escudos de clubes, sin logo de LALIGA, sin
caras ni fotografías de prensa de jugadores.

PROHIBIDO generar interfaz de aplicación: nada de barras de estado, pestañas,
botones ni cifras en euros legibles en el arte generado — las únicas pantallas
de producto son capturas reales insertadas después.
```

## Capturas reales necesarias

Las slides 5, 6 y 7 **no se producen sin ellas**. No hay versión generada. La
petición exacta, con lo que no debe verse, está en `captureRequest` del
`package.json` y en `qa.md`.

## Handoff a Canva

Documento de 8 páginas a 1080×1350, más duplicado a 1080×1920 para Story
reencuadrando sobre el mismo eje vertical.

- Capas fijas: fondo degradado; wordmark abajo a la izquierda a 96 px de cada
  margen; barra roja de 4 px anclada a 300 px del borde inferior, con 135 px de
  ancho en la página 1 y creciendo 135 px por página hasta 1080 px en la 8.
- Estilos de marca: N1 Sora ExtraBold 96 · N2 Sora Medium 60 · N3 Sora Regular 38.
  Márgenes 96 px, zona segura inferior 220 px.
- Páginas 5, 6 y 7: marco vacío con esquinas de 32 px y borde rojo de 2 px,
  esperando el archivo. Insertar ajustado por dentro, **sin** filtro, ajuste de
  color, brillo ni viñeta. La página 6 usa el mismo archivo que la 5 ampliado
  por recorte, no una imagen distinta.
- Exportar PNG a calidad máxima: en JPG las cifras de las capturas pierden
  legibilidad. Nombrar `LL-carrusel-cartera-01` … `-08`.
- Para tapar datos, gris neutro `#2a2830` opaco — **nunca** el rojo de marca,
  para no simular UI.
