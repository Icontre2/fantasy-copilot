# Dirección visual (obligatoria)

Encargo recibido el 2026-08-13. Conservar **toda** la funcionalidad actual de
LigaLab y darle una estética más oscura, futbolera, compacta y premium, tomando
como referencia las capturas de Iñigo.

## Sistema visual

- Fondo general negro o casi negro. Tarjetas en gris muy oscuro.
- **Morado eléctrico** como color principal.
- Verde = positivo · naranja = aviso · rojo = riesgo.
- Bordes finos y discretos. Fotografías recortadas de los jugadores.
- Tipografía clara: nombres y cifras importantes muy visibles.
- Información compacta sin saturar. **iPhone primero**, respetando safe areas.

## Navegación

Se mantiene la navegación **inferior** actual de LigaLab (funciona mejor en
móvil). No se copian las seis pestañas superiores apretadas de las capturas.

Secciones principales: **Inicio · Plantilla · Mercado · Alertas · Más**.
Comparador, economía, clasificación, onces y exportaciones van dentro de «Más»
o con accesos secundarios claros.

## Tarjetas de jugador

Muestran, **cuando el dato exista**: foto, nombre, equipo, posición,
propietario, valor, cláusula, % de titularidad, media de puntos, tendencia,
blindaje, días para desbloquearse, próximo rival y —en mercado— precio de salida
y puja propia.

Franja o borde lateral de color para estados verificables: verde (favorable o
cláusula desbloqueada), naranja (atención), rojo (riesgo inmediato), morado
(alerta activa), gris (dato neutral o insuficiente).

**El color nunca es la única explicación**: siempre acompañado de etiqueta
textual.

## Por pantalla

**Alertas de cláusula**: buscador por jugador; filtros Todas / Desbloqueadas /
Próximas / Bloqueadas / Críticas; tarjetas compactas; días para el desbloqueo
destacados; botón de cláusulazo; avisos de «saldo insuficiente» o «cláusulazo
bloqueado». Sin etiquetas tipo «obligatorio» salvo regla objetiva y explicada.

**Plantilla**: tarjetas oscuras, % titularidad, media, cláusula y blindaje. Once
probable y formación visual. Jugadores clicables hacia su ficha e histórico.

**Mercado**: buscador y filtros por posición y procedencia; tarjetas compactas
con precio de salida, valor, titularidad, media, nº de pujas y puja propia;
acciones reales de crear, modificar y cancelar puja; aviso de cierre de mercado
si LALIGA publica la fecha.

**Comparador** (referencia: pantalla «VS»): dos jugadores, fotos y equipos, y
comparación de valor, cláusula, evolución 7D y 30D, media, % titularidad, puntos
totales, próximo rival y caja necesaria. Gráficas enfrentadas cuando haya
histórico real. Resaltar quién gana en cada métrica objetiva.

**Listados**: ordenables por valor, crecimiento, media o titularidad. Cada
ordenación sobre una métrica real. `N/D` cuando el dato no exista.

**Gráficas**: filtros 7D / 30D / 90D / Todo, seguimiento al deslizar, leyendas,
fechas y valores reales. No rellenar días anteriores al inicio del seguimiento.
No interpolar ni inventar histórico. Morado, verde y gris sobre fondo oscuro.

## Regla fundamental sobre los datos

**La referencia visual se adopta; sus recomendaciones inventadas NO.**

Prohibidos sin metodología fiable: nota de fichaje, «buen fichaje», «venta
urgente», «intocable», «parches», «pasar», puja máxima recomendada, puntos
esperados inventados, y cualquier consejo generado solo para llenar la interfaz.

Solo se muestran datos de LALIGA Fantasy, FútbolFantasy, históricos recopilados
por la app, y cálculos transparentes derivados de ellos. Cada métrica dudosa
lleva leyenda de procedencia.

## Accesibilidad

Contraste suficiente · botones táctiles ≥ 44 px · textos sin cortar · tablas
adaptadas o sustituidas por tarjetas · estados de carga, error y vacío claros ·
**confirmación antes de cualquier puja o cláusulazo real**.

## Antes de publicar

Revisar todas las pantallas en viewport de iPhone; que las alertas no se salgan;
que filtros y navegación se adapten; que ningún texto se superponga; conservar
intacta la lógica del backend; y corregir cualquier fallo funcional que
introduzca el cambio visual **antes** de desplegar.

---

## Datos que el encargo pide y aún hay que confirmar

Esta sección no está en el encargo: la añado porque tres de los campos pedidos
pueden no existir, y la regla de arriba dice que no se inventan. Antes de
diseñar una tarjeta alrededor de un dato, hay que saber si el dato está.

| Dato pedido | Estado | Nota |
| --- | --- | --- |
| % de titularidad | **Disponible** | `lineupProbability`, de FútbolFantasy (`dashboard.ts`). Es scraping: puede faltar, y entonces va `N/D`. |
| Estado del blindaje | **Disponible** | `isShielded`, booleano de LALIGA. |
| **Días para desbloquearse** | **Por confirmar** | El esquema solo tiene `isShielded` como booleano — no hay fecha de expiración. Si LALIGA no la publica, este dato **no se puede mostrar**: no se calcula ni se estima. |
| Próximo rival | **Por confirmar** | El calendario autenticado da ids de equipo; el encargo ya lo condiciona a «fuente fiable». |
| Nº de pujas | Disponible en vivo | `numberOfBids`. El histórico llega siempre a 0: no sirve como serie. |
| Pujas ajenas | **No existe** | LALIGA no las publica ni en vivo. El encargo ya lo excluye. |
| Evolución 7D / 30D | Disponible | Serie diaria pública. Ojo: entre temporadas se congela — ver `MAX_HISTORY_AGE_DAYS` en `alerts/clause-alerts.ts`. |

## Caja y valor de plantilla

- `teamValue` es solo el valor actual de los jugadores. Nunca se suma ni se resta para inferir caja.
- La caja puede ser negativa; ningún cálculo debe recortarla a cero.
- Si el historial de actividad no cubre desde el inicio de la liga, para rivales solo se muestra el flujo conocido (ventas − compras + bonus de puntos), no una caja absoluta inventada.
- El saldo oficial solo se etiqueta como tal cuando LALIGA publica `teamMoney`.

## Revisión móvil hecha (390 × 844)

Las doce pantallas se han recorrido con datos de prueba en un viewport de
iPhone 14, con captura completa de cada una. Resultado: **ninguna desborda a lo
ancho, ninguna produce errores de consola**, y todos los elementos tocables
llegan a 44 px salvo los `<input>`, que van dentro de una etiqueta de 48 px que
es la que recibe el toque.

Lo que la revisión encontró y se ha corregido:

| Pantalla | Fallo | Arreglo |
| --- | --- | --- |
| Exportar | Los dos botones de descarga eran texto casi negro sobre fondo negro: ilegibles | Tarjeta con icono, texto blanco y borde morado |
| Liga completa | Tabla de seis columnas con `min-w-[560px]`: se leía «Valor planti…» cortado | Una fila por manager con sus cifras debajo; la plantilla se despliega ahí mismo |
| Inicio | Cabecera azul marino y lima de la etapa anterior; el hueco «sin histórico» era una barra blanca que parecía un error de carga | Cabecera negra con morado; el hueco es oscuro y lleva texto |
| Onces probables | Tarjetas gris claro y enlace blanco sobre app negra | Tarjetas oscuras; el color del porcentaje va acompañado de «Probable / Duda / Poco probable» |
| Mercado | La fila de orden se salía por el borde; «1 pujas» | Rejilla sin scroll lateral; singular correcto |
| Alertas | Un jugador sin tendencia mostraba solo dos guiones, sin decir por qué | La tarjeta explica si falta histórico, si está congelado o si el valor no sube |
| Economía | La cifra grande no tenía rótulo y se leía como «todos en negativo»; el libro se abría al final de la pantalla | Rótulo «Saldo de operaciones» pegado al número; el libro se abre bajo el manager que tocas |

Lo que **no** se ha tocado: ninguna cifra, ningún cálculo y ninguna ruta de
servidor. Esta pasada es solo de presentación.

## Cristal líquido

El acabado de las superficies es vidrio: `backdrop-filter` sobre un campo de luz
de colores fijo detrás del contenido, más un brillo de canto (`inset`) que da el
bisel. Vive en `app/globals.css`, en `@layer components`, con cuatro clases.

| Clase | Dónde | Por qué así |
| --- | --- | --- |
| `.glass` | Tarjetas normales | Vidrio estándar, difumina 20 px |
| `.glass-strong` | Cabeceras de pantalla | Más grueso y con tinta morada |
| `.glass-sheet` | Ficha de jugador | Casi opaco: se abre encima de una lista |
| `.glass-soft` | Chips dentro de una tarjeta | Sin `backdrop-filter` a propósito |
| `.glass-nav` | Barra inferior | El más difuminado, con base oscura |

Tres decisiones que no son estéticas y conviene no deshacer:

1. **El fondo con manchas de color (`body::before`) no es decoración: es el
   requisito.** Difuminar negro sobre negro da negro. Va `fixed`, así el
   contenido se desliza por encima y el cristal cambia de tono según dónde esté.
2. **La barra inferior y la ficha llevan una base oscura bajo el vidrio.** Son
   las dos superficies que pueden tener cualquier cosa detrás. Sin esa base, la
   ficha se cruzaba con los filtros del mercado y no se leía ninguna de las dos.
3. **`.glass-soft` no difumina.** Un cristal dentro de otro cristal ya no tiene
   la página detrás: no refracta nada nuevo y cuesta otra capa de composición en
   cada scroll.

Si el navegador no soporta `backdrop-filter`, o el sistema pide
`prefers-reduced-transparency`, todas caen a superficie opaca. Los colores de
texto no dependen del cristal en ningún caso.
