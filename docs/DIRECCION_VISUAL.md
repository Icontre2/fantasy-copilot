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
