# Pipeline de imagen — carruseles, comparativas y tarjetas

Contenido estático: más barato, más rápido y **mejor para guardar y compartir**
que el vídeo. Un carrusel bien hecho se guarda; un vídeo se ve y se olvida.

---

## 1. Los cinco tipos que funcionan

| Tipo | Formato | Para qué pain point |
| --- | --- | --- |
| **A vs B** | 1080×1350 | C4 — «¿a cuál fichas?» |
| **Gráfica de evolución** | 1080×1350 | C1, C2, C5 |
| **Ranking** | 1080×1350 o carrusel | Motor diario *(requiere rankings globales)* |
| **Alerta de cláusula** | 1080×1920 story | A1, A2, A3 |
| **Tarjeta compartible** | 1080×1920 | Bucle viral *(no existe aún en producto)* |

---

## 2. Estructuras de carrusel — **rotar**

Si todos los carruseles tienen la misma forma, el perfil se vuelve previsible y
la gente deja de parar. Cuatro moldes, alternando:

**M1 · Clásico (6)**
Problema → Contexto → Dato → Decisión → Solución → CTA

**M2 · Lista (5)**
«3 jugadores que…» → uno por slide → CTA

**M3 · Duelo (4)**
Dilema → A → B → «¿tú qué haces?» *(el CTA es el comentario, no el enlace)*

**M4 · Confesión (5)**
Error personal → qué pasó → cuánto costó → cómo se evita → CTA

---

## 3. Sistema visual

Aquí conviven **dos paletas**, y no es un descuido: es la regla que hace legible
la pieza.

### El rojo es la frontera

**Lo generado por nosotros usa el rojo de marca. El morado solo aparece dentro
de una captura real del producto, sin tocar.**

Esta sección decía antes que el sistema visual «hereda del producto» y prescribía
acento morado también para el arte generado. La premisa era correcta —`#8b5cf6`
es la paleta real de la app (`app/globals.css`)— pero la conclusión estaba mal, y
chocaba de frente con `brand/CONTENT_RULES.md:10` («el rojo de marca se usa en
marketing, store, logo y framing») y con `brand/BRAND.md:17`.

El argumento que decide no es la jerarquía de documentos, es este: **si el arte
generado usa el morado del producto, el espectador deja de distinguir lo generado
de la UI real.** Y eso es exactamente el fallo que prohíbe el §5 de este mismo
documento. El rojo hace de frontera: rojo = lo decimos nosotros, morado = es la
app. El objetivo de «que reconozcan la app antes de instalarla» se cumple mejor
enseñando la app de verdad que imitando su paleta.

### Marketing — lo que generamos

| | |
| --- | --- |
| Fondo | `#08070a` → `#050506`, degradado plano. **Sin manchas de luz moradas** |
| Acento | **Rojo LigaLab**, un solo énfasis por pieza |
| Marco de captura | Filete rojo alrededor de toda captura real. Si no hay captura, no hay filete |
| Tipografía | **Sora** (titulares y cifras) |
| Cifras | Tabulares. Formato `18,0 M€` |
| Marca | Esquina inferior, pequeña. Nunca protagonista |

> **El hex del rojo de marca no está definido en este repositorio.** `BRAND.md:17`
> lo nombra pero no lo fija. Hasta que identidad lo cierre, se pide por su nombre
> y quien produzca usa el valor aprobado — **no se inventa un hex plausible ni se
> copia de una pieza anterior**, que es como se acaba con tres rojos distintos.

### Producto — lo que NO tocamos

| | |
| --- | --- |
| Acento | Morado `#8b5cf6` / `#7c3aed` (`app/globals.css`) |
| Tendencia | Positivo `#34d399` · Negativo `#fb7185` |

Estos valores están aquí **para reconocerlos, no para reproducirlos**. Aparecen
solo dentro de una captura real, tal cual salgan: sin recolorear, sin armonizar
con el rojo, sin «ajustar» nada (`CONTENT_RULES.md:9`).

> El `#e0b458` que esta tabla listaba como «Aviso» no aparece en ningún sitio del
> producto. Se retira: un color que no existe en la app no es la paleta de la app.

**Prohibido:** escudos de clubes, el logo de LALIGA, fotos de prensa de jugadores.
Riesgo de derechos y de que nos identifiquen como oficiales. Usar iniciales,
siluetas o solo el nombre.

---

## 4. Prompt base para generación

Este prompt describe **solo el arte generado**. Las pantallas de producto no se
piden aquí: se piden como captura (§5).

```
Tarjeta vertical 1080x1350 para redes, tema oscuro casi negro (#08070a a
#050506), degradado plano y sin manchas de luz de color. Acento rojo de
marca LigaLab, un solo énfasis por pieza. Tipografía geométrica sans
(estilo Sora), muy marcada, cifras grandes tabulares. Estética de app
financiera premium, vidrio esmerilado sobre fondo oscuro. Composición
limpia, mucho aire, jerarquía clara.

Sin logos de marcas reales, sin escudos, sin el logo de LALIGA, sin caras
ni fotografías de prensa de jugadores.

PROHIBIDO generar interfaz de aplicación: nada de barras de estado,
pestañas, botones, gráficas de producto ni cifras en euros legibles. Las
únicas pantallas son capturas reales insertadas después.

CONTENIDO: [texto]
```

La última línea es la que faltaba. La prohibición de inventar UI vivía solo en la
prosa del §5, no en el prompt que se le pasa al modelo — y un modelo no lee el
§5.

---

## 5. La regla que evita el problema

**La captura del producto es real, siempre.** Nunca un mockup inventado con
cifras bonitas. Si la gráfica que enseñas no existe en la app, estás vendiendo
algo que no van a encontrar — y esa decepción se paga en desinstalación y en
reseña de una estrella.

Si necesitas una liga presentable para capturas: usa una de prueba con datos
reales de tu propia liga, y **tapa los nombres de personas identificables**.
