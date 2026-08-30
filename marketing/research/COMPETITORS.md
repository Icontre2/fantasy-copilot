# Competencia — lo verificado y lo que no

> **Método.** Búsqueda web y lectura de fichas de tienda el **2026-08-19**. Las
> fichas de Google Play no se dejan leer por programa (son JavaScript), así que
> de esas apps solo consta lo que aparece en resultados de búsqueda y en su
> propia descripción.
>
> **Donde no hay dato, pone «no verificado».** No se estiman descargas ni
> ingresos: un número inventado aquí contamina todas las decisiones de abajo.

---

## Resumen ejecutivo

Tres conclusiones incómodas y una buena:

1. **El hueco que creíamos nuestro no está vacío.** FantasyStats anuncia
   explícitamente *«analizar oportunidades de cláusulas en equipos rivales»*, que
   es el titular de LigaLab.
2. **Los competidores dan lo que nosotros nos negamos a dar**: recomendaciones de
   fichaje y estimaciones de puntos. Comercialmente eso vende.
3. **Dependemos de un competidor.** Los onces probables salen de raspar
   FútbolFantasy, que tiene su propia app de analítica.
4. **La buena:** nadie anuncia reconstruir la **caja de los rivales**, ni
   ejecutar cláusulas y pujas desde la propia herramienta.

---

## FantasyStats — el rival más directo

| | |
| --- | --- |
| Dónde | Google Play (`com.guillefc.fantasystats`) |
| Precio | No verificado |
| Valoración y nº de reseñas | **No verificado** |
| Descargas | **No verificado** |

**Lo que anuncia** (de su propia descripción):
- Clasificación, plantilla y mercado de tu liga.
- **Recomendaciones de fichaje** según calidad, titularidad, calendario y
  necesidades de tu plantilla.
- Comparar jugadores antes de fichar, vender o alinear.
- Once recomendado **con estimación de puntos** para la próxima jornada.
- **Analizar oportunidades de cláusulas en equipos rivales.**
- **Avisos** de cierre de mercado, desbloqueo de cláusulas y cambios de
  titularidad.
- Lesiones, sanciones y recuperaciones.
- Descargo: *«aplicación independiente… no está afiliada, asociada ni respaldada
  por LALIGA Fantasy»*.

### Revisión del 2026-08-30 — lo nuevo y lo que sigue sin poder verse

**Google Play sigue siendo ilegible desde aquí, y ahora está comprobado en vez
de supuesto.** La revisión del 19 de agosto lo atribuyó a que la ficha es
JavaScript. Se ha vuelto a intentar con un navegador real (Chromium headless a
través del proxy de salida), que sí ejecuta ese JavaScript: Google corta la
conexión (`ERR_CONNECTION_RESET`, y el proxy registra el túnel cerrado a mitad
contra `www.google.com:443`). No es un problema de renderizado — es que no nos
dejan entrar. Valoración, reseñas y descargas **reales de Play siguen sin
verificar**, y desde este entorno no hay forma de conseguirlas.

**Lo que sí se ha podido leer, de UNA sola fuente espejo (apkcombo) y sin
contrastar con ninguna otra** — apkpure y appbrain devuelven 403:

| | |
| --- | --- |
| Versión | 2.0.0 (build 41) |
| Publicada | 11 de mayo de 2026 |
| Tamaño | 33 MB · requiere Android 7.0+ |
| Desarrollador que declara el espejo | «StatsFantasy» |
| Descargas según el espejo | «50+» |
| Valoración según el espejo | 4/5 sobre **1** reseña |

> **Estos dos últimos números NO se dan por buenos.** Los contadores de un
> espejo miden descargas del propio espejo, no instalaciones de Play, y una
> muestra de 1 reseña no dice nada de nadie. Si fueran ciertos cambiarían la
> lectura competitiva entera —FantasyStats sería casi irrelevante en volumen—,
> y precisamente por eso no se apoya ninguna decisión en ellos hasta
> confirmarlos a mano en Play.

**El cambio que sí importa, y que la ficha del 19 de agosto no recogía:** la
descripción actual se presenta como **«Asistente IA para La Liga Fantasy,
Fantasy Marca y Biwenger»**. Dos cosas nuevas ahí:

1. **Ya no es solo LaLiga Fantasy.** Cubre también Fantasy Marca y Biwenger, el
   mismo movimiento multi-liga que hace Analítica Fantasy. LigaLab es
   monoplataforma.
2. **Se posiciona como «IA»** de forma explícita, que es un reclamo de tienda
   que nosotros no usamos.

Que solo conste una versión publicada (mayo de 2026) sugiere una app joven o
con poco ritmo de release, pero el espejo tampoco guarda historial completo, así
que **no se concluye nada de eso**.

**Solape con LigaLab:** casi total en la parte de cláusulas y mercado.

**Dónde LigaLab gana:** caja reconstruida de rivales; ejecutar la cláusula y la
puja dentro de la app; método explicado en pantalla.

**Dónde LigaLab pierde hoy:** avisos (los suyos funcionan, los nuestros están
apagados), lesiones y sanciones (no las tenemos), recomendaciones (no las
haremos).

---

## Analítica Fantasy

| | |
| --- | --- |
| Dónde | App Store `id6756886985` |
| Desarrollador | Dayan Ruiz Riera |
| Precio | Gratis con publicidad, sin suscripción mencionada |
| Valoración | **5,0** — sobre **solo 5 valoraciones** (muestra irrelevante) |
| Puesto | **#13 en Deportes** (App Store, en la consulta) |
| Subtítulo | «Onces y estadísticas fantasy» |

**Lo que ofrece:** onces probables con porcentaje de confianza, mercado en tiempo
real, **predicción de mercado** (quién sube y quién baja mañana), analizador de
plantilla **con IA**, **calculadora de cláusula y de puja óptima**, fichas de
jugador con lesiones y sanciones, histórico de enfrentamientos, actividad de
fichajes. Cubre **LaLiga Fantasy, Biwenger, Mister, Fantasy Marca y Comunio**.

**Lectura:** #13 en Deportes con 5 valoraciones sugiere una categoría con poca
competencia real en tienda, o un ranking muy sensible a picos. **Es una
oportunidad de ASO**: la barrera de entrada al top parece baja. No es una
promesa: es una hipótesis a validar mirando el ranking varios días seguidos.

**Contraste directo con LigaLab:** ellos predicen el mercado de mañana y estiman
puntos con IA. Nosotros nos negamos. Es la misma categoría con filosofías
opuestas, y ese contraste es explotable en contenido — sin nombrarlos.

---

## Fantasy Market

| | |
| --- | --- |
| Dónde | App Store `id6749570046` |
| Datos de tienda | **No verificados** |

Anuncia valores de mercado en tiempo real, evolución, detección de oportunidades
de compra y venta, y estadísticas por jugador (puntuaciones, minutos, goles,
asistencias).

---

## FútbolFantasy / Fantasy Analytics

| | |
| --- | --- |
| Dónde | Web `futbolfantasy.com/analytics` + app `com.futbolfantasy.analytics` |
| Datos de tienda | **No verificados** (Google Play no legible) |

El referente establecido del sector en España. Cubre LaLiga Fantasy, Comunio,
Liga Fantasy, Fantasy Marca, Biwenger, Mister y Futmondo. Tiene sección de
mercado y de seguimiento.

> ⚠️ **Riesgo estratégico.** LigaLab **depende** de esta web: los onces probables
> y los porcentajes de titularidad se obtienen raspándola. Es a la vez proveedor
> y competidor. Si cambian el HTML, o si nos bloquean al crecer, esa función
> desaparece. Hacer marketing agresivo contra ellos sería, además de feo, un
> disparo al pie.

---

## LALIGA Fantasy (la oficial)

No es competidor: es la plataforma. Todo el público objetivo ya la tiene
instalada. Nuestra propuesta es un **complemento**, y el mensaje debe respetarlo
—«sin sustituir a la oficial»— tanto por honestidad como por supervivencia.

---

## Lo que no se ha podido verificar

Queda pendiente y **no debe rellenarse a ojo**:

- Valoraciones y nº de reseñas de FantasyStats, Fantasy Market y Fantasy
  Analytics.
- Volumen de descargas de cualquiera.
- Precios de sus versiones premium, si las tienen.
- Contenido de las reseñas negativas — **es lo más valioso que falta**: es donde
  están los puntos de dolor literales, con las palabras del usuario.

**Cómo cerrarlo (30-45 min, manual):** abrir cada ficha en el móvil, ordenar
reseñas por «más recientes» y por «más críticas», y copiar 20-30 literales a
`PAIN_POINTS.md`. Es la tarea de investigación de mayor retorno que queda.

**Y tiene que ser a mano, con un móvil de verdad.** El 2026-08-30 se intentó
automatizar con un navegador real y Google corta la conexión (ver la revisión de
esa fecha, arriba). No es que falte una librería o un truco de scraping: es que
desde un servidor no se entra. Cualquier intento futuro de resolverlo por
programa va a chocar con lo mismo.

---

## Conclusión para el posicionamiento

No podemos vendernos como *«lo que nadie hace»*. Sí como:

> **La única que te dice cuánto dinero tiene realmente tu rival — y que no se
> inventa nada.**

Lo primero es verificablemente único hasta donde alcanza esta investigación. Lo
segundo es una postura, y las posturas se defienden con método, no con adjetivos.
