# LigaLab — especificación completa para construir la app

> Pega este documento entero como instrucción inicial. Está escrito para que
> alguien que no conoce el proyecto pueda construirlo sin preguntar nada.

---

## 1. Qué eres y qué vas a construir

Eres un ingeniero de software senior. Vas a construir **LigaLab**, una aplicación
web móvil que acompaña a **LALIGA Fantasy** (el juego oficial de fantasy fútbol
de LALIGA, España).

LigaLab **no sustituye** a la app oficial. Es una capa de consulta que enseña
mejor lo que la oficial enseña mal o no enseña: la caja de cada rival, las
cláusulas que están a punto de ser rentables, los onces probables, la economía de
la liga y el contexto de dificultad de cada partido.

El usuario es una persona que juega una liga privada con amigos. Usa la app **de
pie, con una mano, en el móvil**, normalmente mirando algo rápido antes de que
cierre el mercado.

**A dónde va todo esto:** el objetivo final es que la app pueda **jugar sola**,
ejecutando reglas que escribe el usuario, mientras él duerme. Está detallado en
§12 y conviene leerlo antes de tomar decisiones de arquitectura: casi todo lo que
se construya acaba siendo un ladrillo de eso.

---

## 2. LA REGLA QUE MANDA SOBRE TODAS LAS DEMÁS

**Si no sabemos un dato, la app tiene que decir que no lo sabemos.**

Nunca rellenes un hueco. Nunca sustituyas un dato que falta por un cero, por una
media, ni por una estimación disfrazada de dato. Un `undefined` de la API
significa *"la API no lo publica"*, y eso se enseña como tal.

En cada número que pinte la pantalla tiene que quedar claro cuál de estas cuatro
cosas es:

| Tipo | Cómo se presenta |
|---|---|
| **Dato oficial de LALIGA** | Tal cual, sin adornos |
| **Cálculo nuestro** | Con `≈` y explicando la fórmula en una línea |
| **Dato incompleto** | Diciendo qué falta y cuánto falta |
| **Estimación** | Etiquetada como escenario, nunca como pronóstico |

Ejemplo real de la app: en las cuotas de apuestas se enseña la cuota decimal
**tal cual la publica la casa** (dato), y debajo el porcentaje **con `≈`** porque
es cálculo nuestro (quitarle el margen a la casa). Y siempre se dice **qué casa**
la publica.

Otro ejemplo: LALIGA solo publica `teamMoney` (caja) del usuario conectado. Para
los rivales llega vacío. La versión anterior hacía `teamMoney ?? 0` y presentaba
"Patrimonio total"; eso **afirmaba que la caja del rival es cero** cuando lo
cierto es que no se sabe. Un rival con 30 M en caja aparecía igual que uno
arruinado. Eso es exactamente lo que no se puede hacer.

### 2.1 Prohibido (no negociable)

Lo prohibido **no es automatizar**: es **inventar un número y presentarlo como si
se supiera**. Con eso en la cabeza, esto no se construye:

- Predicciones de puntos, "puntos esperados" o cualquier cifra futura inventada
- Consejos de fichaje disfrazados de dato ("nota de fichaje", "valor objetivo",
  "puja máxima recomendada")
- Presentar el once probable como un consejo de alineación
- Cualquier número que el usuario no pueda recalcular a mano

Lo que **sí** se permite, y es la diferencia que sostiene todo el proyecto:

| Permitido | Prohibido |
|---|---|
| Ejecutar **reglas que escribe el usuario** | Decidir por su cuenta qué conviene |
| Aritmética sobre datos oficiales | Modelos cuyo resultado no se puede comprobar |
| «Su valor está a un 4 % de la cláusula» | «Este jugador va a hacer 8 puntos» |

Enseñar el once **más probable según porcentajes publicados por terceros** está
permitido, diciendo de quién son esos porcentajes y que no cambia la alineación
oficial de nadie.

Ver §12: el objetivo final del proyecto es un piloto automático, y encaja con
esta regla precisamente porque **obedece reglas, no opina**.

Sí se permite: enseñar el once **más probable según los porcentajes publicados
por terceros**, dejando claro de quién son esos porcentajes y que no cambia la
alineación oficial de nadie.

---

## 3. Pila técnica

- **Next.js 16** (App Router) + **Turbopack**
- **React 19** — el compilador de React está activo y es estricto (ver §11)
- **TypeScript** en modo estricto
- **Tailwind CSS v4** (con capas en cascada: cuidado, las utilidades ganan a
  `@layer components`)
- **Zod** para validar respuestas externas
- **Supabase** (PostgreSQL) para sesión persistente
- Tests con el runner nativo de Node: `node --experimental-strip-types --test`.
  **No vitest, no jest.**
- Despliegue en **Vercel**

### 3.1 Regla de arquitectura

```
Interfaz  →  /api/fantasy/*  →  src/server/laliga/*  →  API de LALIGA
```

El navegador **nunca** habla con LALIGA ni con ninguna fuente externa. Toda la
lógica y todos los tokens viven en el servidor. La interfaz solo llama a rutas
propias. No metas clientes de autenticación ni SDKs de terceros en el navegador:
abrir un segundo camino a los datos es exactamente lo que no queremos.

---

## 4. Las fuentes de datos, con sus trampas

Esto es lo que más tiempo cuesta descubrir. Está todo verificado contra las APIs
reales.

### 4.1 LALIGA Fantasy — hay DOS hosts y uno está obsoleto

| Host | Qué sirve |
|---|---|
| `api-fantasy.llt-services.com` | **Temporada ANTERIOR.** No lo uses para datos actuales. |
| `fantasy-api.llt-services.com` | **Temporada en curso.** Este es el bueno. |

Varios endpoints del host actual responden **200 sin token**: catálogo de
jugadores, calendario, jornada actual, cotizaciones. Los datos de tu liga
(plantillas, caja, mercado, actividad) sí necesitan `Authorization: Bearer`.

**Técnica de descubrimiento de endpoints:** llama sin token y mira el código.
`401` = existe y pide autenticación. `404` = no existe. `405` = existe pero no
con ese método (mira la cabecera `Allow`). `403` = un filtro te bloquea y **no
puedes concluir nada**.

Rutas confirmadas (base: `/api/v1/competition/1`):

```
GET  /week/current                          jornada en curso  (sin token)
GET  /calendar?weekNumber=N                 partidos          (sin token)
GET  /players                               catálogo          (sin token)
GET  /league/{id}/teams                     plantillas        (token)
GET  /league/{id}/activity                  libro de operaciones con importes (token)
GET  /league/{id}/market                    mercado           (token)
POST /league/{id}/buyout/{playerId}/pay     pagar cláusula    (token)
GET  /league/{id}/buyout/{playerId}         solo lectura — `Allow: GET`
```

**Subir la cláusula propia no está expuesta**: `/buyout/{playerId}` responde
`Allow: GET`, y `/edit`, `/update`, `/set` devuelven 404. Si te piden esa
función, investiga primero qué llama la web oficial (`laligafantasy.relevo.com`)
antes de prometer nada.

### 4.2 Trampas concretas ya sufridas

- **Zod descarta las claves que no declaras.** Esto tiró silenciosamente campos
  reales dos veces. Si un campo llega y no está en el esquema, desaparece sin
  error. Declara todo lo que uses.
- **`teamId` viene plano, no anidado.** El esquema declaraba `team.id`; el
  catálogo devuelve `teamId` en la raíz (verificado: 792 de 792 jugadores).
- **Un partido sin jugar trae marcador `null`, no `0`.** Propágalo tal cual: si
  lo normalizas a cero, la pantalla no puede distinguir un 0-0 real de un partido
  que no ha empezado.
- **Fuera de las jornadas 1–38 la API responde 500.** Acota antes de pedir.

### 4.3 Cuotas de apuestas — `football-data.co.uk`

CSV abierto, **sin clave ni registro**: `https://www.football-data.co.uk/fixtures.csv`.
Filtra por `Div == "SP1"` (LALIGA). Cachea 3 horas.

Prefiere las columnas `B365H/B365D/B365A` (Bet365, una casa concreta y citable);
si faltan, usa `AvgH/AvgD/AvgA` y **di que es una media de mercado**, no la hagas
pasar por una casa.

Solo trae los partidos que las casas ya tienen abiertos (unos días vista). Un
partido de dentro de tres meses **no tiene cuotas en ningún sitio**: enséñalo sin
ellas, con un texto que lo explique, en vez de un número inventado.

El fichero tarda un par de días en soltar los partidos ya jugados, así que verás
cuotas junto a marcadores cerrados: etiquétalas **"cuotas previas al partido"** o
parecerá que la app no se ha enterado del resultado.

**Nombres de equipo que no coinciden** (salen de sus propios ficheros de las
temporadas 24/25 y 25/26, no de suposiciones):

```
"Ath Bilbao"    → Athletic Club
"Ath Madrid"    → Atlético de Madrid
"Espanol"       → RCD Espanyol de Barcelona
"Dep. A Coruna" → RC Deportivo
```

El resto encaja por palabras. **El emparejamiento es la pieza peligrosa**: si se
equivoca, la app enseña las cuotas de otro partido y no se nota mirando. Regla:
coincidencia exacta de palabras primero, luego contención; si encajan dos
equipos, devuelve `null` y ese partido se queda sin cuotas. Un hueco se ve; un
cruce equivocado no.

Ojo con las palabras "ruido": `cf, fc, rc, cd, ud, sd, ca, rcd, club, de, the`.
**"Real" y "Deportivo" NO son ruido**: quitando "Real", el Real Madrid se queda
en "madrid", que está contenido en "Atletico Madrid" y convierte el derbi en un
cruce ambiguo. Lo cazó un test.

### 4.4 Fuentes descartadas y por qué

- **BeSoccer**: bloquea todo lo que no sea un navegador real. Responde 406 a
  `curl`, corta la conexión a un navegador automatizado y devuelve página
  anti-bot al lector web. Una fuente que no se puede probar es una fuente que se
  rompe en silencio.
- **The Odds API**: funciona, pero exige registro y clave. Innecesario habiendo
  un CSV abierto.

### 4.5 Fuentes de forma (comprobadas, responden 200)

- `analiticafantasy.com`
- `jornadaperfecta.com`

**Regla al mezclarlas:** cada nota lleva el nombre de quien la publica. **Nunca
promedies fuentes**: un 7,2 de una y un 6,8 de otra no dan un "7,0" — ese número
no existe en ningún sitio. Si una fuente no responde, di cuál falta.

---

## 5. Autenticación — son DOS accesos distintos

Esto confunde a todo el mundo, así que tiene que quedar clarísimo en la interfaz.

### 5.1 Acceso a LigaLab (opcional)

Identifica quién eres **en nuestra app**. Google / Apple / Facebook vía Supabase
Auth, con flujo **PKCE del lado del servidor** (endpoints `/auth/v1/authorize` y
`/auth/v1/token?grant_type=pkce`). No montes el cliente de Supabase en el
navegador.

Los proveedores a enseñar se obtienen **preguntándole a Supabase**
(`GET /auth/v1/settings`, campo `external`), no de variables de entorno. Así,
activar uno en su panel hace aparecer su botón sin desplegar, y nunca se enseña
un botón que no funcionaría.

### 5.2 Acceso a LALIGA (imprescindible)

Sin esto no hay datos. LALIGA usa **Azure AD B2C**:

- **Email + contraseña**: flujo *Resource Owner Password Credentials*.
- **Cuentas sociales de LALIGA** (Google/Apple/Facebook): **no tienen contraseña
  en B2C**. Requieren *Authorization Code + PKCE* contra el redirect
  `authredirect://com.lfp.laligafantasy`, que es de la app oficial. Desde una web
  es imposible (B2C rechaza cualquier redirect no registrado con
  `AADB2C90006`), pero **sí funciona desde un contenedor iOS** usando
  `ASWebAuthenticationSession`, que entrega el callback solo a la sesión que lo
  abrió.

**Traduce los errores de B2C.** El crudo llega en inglés con un código que no
dice nada. Y lo importante: `AADB2C90225` **no distingue** una contraseña
equivocada de una cuenta social — devuelve lo mismo en ambos casos. El mensaje
tiene que contar **las dos posibilidades** en vez de elegir una y sonar seguro;
mandar a alguien a cambiar una contraseña que estaba bien es peor que decirle que
hay dos motivos posibles.

Mapea solo códigos que conozcas (`AADB2C90225`, `AADB2C90157` = bloqueo por
intentos). Cualquier otro: enséñalo con su texto original y un encabezado que
diga que viene de LALIGA. Antes "no lo entiendo" que inventar una causa.

### 5.3 Sesión — cuatro modos, y hay que DECIR en cuál estás

El token de LALIGA nunca sale del servidor. Al navegador solo va una cookie
`httpOnly` con un identificador opaco. Los tokens se cifran con AES-256-GCM.

| Modo | Condición | Duración |
|---|---|---|
| `PERSISTENTE` | Supabase + `SESSION_ENCRYPTION_KEY` | 30 días, se renueva sola |
| `CLAVE_INESTABLE` | Supabase pero sin clave fija | hasta el siguiente despliegue |
| `SOLO_COOKIE` | sin Supabase | ~24 h |
| `DESARROLLO` | local sin clave | lo que dure el proceso |

**El caso traicionero es `CLAVE_INESTABLE`.** Si derivas la clave de un token que
la plataforma rota (por ejemplo `VERCEL_OIDC_TOKEN`), todo parece correcto por
dentro —cifra, guarda— pero al rotar el token las sesiones guardadas dejan de
poder descifrarse. El síntoma es "la app me echa cada dos por tres", sin un solo
error en ningún log.

Por eso **la pantalla de acceso enseña el diagnóstico cuando la sesión va a durar
poco**, con su causa y cómo arreglarlo. Ese es justo el momento en que a alguien
le interesa saberlo: el síntoma es estar viendo esa pantalla otra vez.

---

## 6. Pantallas

Navegación inferior fija de cinco: **Inicio · Plantilla · Mercado · Alertas ·
Más**. Lo demás cuelga de "Más".

### 6.1 Inicio
Tu posición, tus puntos, tu caja, y la tabla de rivales con **caja y patrimonio
de cada uno**. Cuando la caja de un rival no es oficial, se etiqueta como
reconstruida a partir del libro de operaciones y se dice el saldo inicial usado.

### 6.2 Plantilla
Campo de fútbol con tu once más probable. Por cada jugador: foto, nombre,
probabilidad de ser titular (`%`, `TIT` si está publicado sin porcentaje, `?` si
no hay señal), puntos de la jornada en curso si constan, y **rival + dificultad**
(`vs GET · Igualado`).

Debajo, el banquillo plegable.

### 6.3 Mercado
Jugadores en venta, con su valor, su dueño y la posibilidad de pujar.

### 6.4 Alertas
Jugadores cuyo **valor de mercado se acerca a su cláusula** — el momento en que
clausular sale a cuenta.

Todo aritmética transparente sobre datos oficiales: hueco, porcentaje, tendencia
diaria y días estimados = `cuanto falta / cuanto sube al día`. La hipótesis
("la subida reciente se mantiene") se dice en voz alta, y por eso es un
**escenario**, no un pronóstico. Cualquiera tiene que poder recalcular a mano
cualquier número de la pantalla.

Un jugador sin cláusula publicada **no genera alerta**: sin cláusula no hay con
qué comparar.

### 6.5 Jornadas
Horarios y resultados de las 38 jornadas, navegables. Agrupados por día. Con las
cuotas 1X2 de cada partido cuando existan (§4.3).

Tres situaciones y se dicen distinto: la fuente no responde / responde pero esta
jornada no está abierta en las casas / hay cuotas.

### 6.6 Ficha del jugador (hoja inferior)
Se abre al tocar cualquier jugador desde **seis pantallas distintas**. Contiene:

- Valor, puntos, media, puntos del año pasado
- **Cláusula de rescisión** y, si procede, el botón de pagarla (§7)
- **Su partido**: rival, día y hora, las tres cuotas con su columna resaltada, y
  la dificultad en palabras
- **Estado de forma**: puntos por jornada publicados por LALIGA
- **Evolución del valor**: gráfica con el dedo deslizable

### 6.7 Otras
Liga completa (plantillas y onces de los rivales), Economía, Comparar jugadores,
Exportar CSV.

---

## 7. Pagar una cláusula — la operación delicada

Es la única acción que **mueve dinero real del juego y no se puede deshacer**.

1. Una ruta **solo lee**: de quién es el jugador, cuánto es la cláusula, si está
   blindado, cuánta caja tienes.
2. El pago va por **su propia ruta**, que lo vuelve a comprobar **todo** justo
   antes de ejecutar. Entre que se pinta el botón y se pulsa pueden pasar
   minutos, y en ese rato la cláusula sube o el jugador cambia de dueño.
3. El cliente envía **la cláusula y el dueño que vio el usuario**. Si el servidor
   ve otra cosa, **se niega** (`409`) en vez de pagar algo distinto.
4. Cerrojo por jugador para que dos toques no paguen dos veces.
5. Confirmación con la cifra escrita y el aviso de que es irreversible.

**Cuando no se puede, di por qué** (blindado hasta tal hora / es tuyo / no te
llega la caja) en vez de dejar un botón apagado sin explicación.

**Matiz importante:** si LALIGA **no publica** tu caja, eso **no bloquea**. No
saber cuánto tienes no es saber que no te llega; deja intentarlo y que conteste
LALIGA. Bloquear ahí sería inventarse un motivo.

**Y si LALIGA acepta pero aún no lo refleja**, dilo tal cual. Decir "hecho" sería
afirmar lo que no consta; decir "error" llevaría a intentarlo otra vez y pagar
dos veces.

---

## 8. Diseño visual

- **Móvil primero**, 390 px de ancho de referencia. Nunca desborde horizontal.
- Fondo **negro** con un campo de color ambiental fijo; acento **violeta
  eléctrico** (`#7c3aed`).
- Estética **liquid glass**: superficies translúcidas con desenfoque, bordes
  sutiles. **Obligatorio** dar alternativa sólida con `@supports not` y respetar
  `prefers-reduced-transparency` y `prefers-reduced-motion`.
- **El color nunca es la única explicación.** Siempre acompaña una palabra: "Muy
  favorable", "Difícil". Quien no distinga verde de rojo tiene que leer lo mismo.
  Y ojo con el fondo: sobre el verde del campo los tintes translúcidos se
  enturbian y el rojo parece gris — ahí usa chip oscuro con el color en el texto.
- Zonas táctiles de **44 px mínimo**.
- **Nada de tablas en móvil**: tarjetas.
- Texto nunca cortado ni recortado.
- Números tabulares (`tabular-nums`) en todo lo que sean cifras.

### 8.1 La hoja inferior (bottom sheet)

La ficha del jugador se cierra **deslizando hacia abajo**. Detalles que separan
un gesto bueno de uno malo:

1. **Tirador visible arriba.** Sin él, el gesto existe pero nadie lo descubre.
2. **Cierra por distancia (25% de la altura) O por velocidad.** Un empujón corto
   y rápido significa "fuera" igual que un arrastre largo; solo con distancia, un
   golpe rápido rebota y parece que la app no te ha hecho caso.
3. **Hacia arriba resiste** (amortiguación con raíz), no se estira.
4. **El fondo se aclara** según baja: ves lo que va a pasar antes de soltar.
5. **NO pelea con el scroll**: el arrastre solo empieza si el contenido ya está
   arriba del todo. Si estás leyendo por la mitad y bajas el dedo, eso es scroll.
   Sin este matiz la hoja se cierra sola cada vez que intentas leer.
6. **La X y Escape siguen funcionando.** Un gesto sin alternativa deja fuera a
   quien navega con teclado.

Dos fallos que solo aparecen probando el gesto de verdad:

- Al soltar, el evento de subida llega con **las mismas coordenadas** que el
  último movimiento. Si mides la velocidad hasta él, **siempre da cero**. Mide
  entre dos muestras de *movimiento*, sobre una ventana de ~30 ms.
- Un gesto rápido dispara mover y soltar **antes de que React vuelva a pintar**.
  Si la condición "se está arrastrando" vive solo en estado, al soltar todavía
  dice que no y el gesto se descarta. Guárdala en una `ref`.

---

## 9. Resistencia a fallos

**Una pantalla no puede caerse entera porque falte un trozo de la respuesta.**

Casos reales que tumbaron pantallas completas:

- `data.competitors` llegó `undefined` → `for...of` reventó → Inicio en blanco.
- `history.slice` sobre `undefined` → la ficha entera rota.
- `data?.failedPlayerIds.length` → el `?.` protegía que faltara `data`, pero no
  que llegara **sin ese campo**: `undefined.length` tumbó Plantilla.

Regla: comprueba **la forma de lo que vas a usar**, no solo que el objeto exista.
`Array.isArray(x) && x.length > 0`. Y una parte que falla se enseña como un hueco
con explicación, no como una excepción.

---

## 10. Cómo se escribe el código aquí

### 10.1 Lógica pura, aparte y con tests

Todo lo que se pueda decidir sin red va a su propio módulo, sin importar rutas
con alias `@/` (no se pueden cargar desde los tests). Ejemplos: emparejar nombres
de equipo, convertir cuotas a probabilidad, decidir si un gesto cierra una hoja,
decidir si se puede pagar una cláusula.

Los tests prueban **lo que puede salir mal de verdad**, no que 2+2 sean 4:

- Que un nombre ambiguo devuelva `null` en vez de emparejar mal
- Que ningún equipo de la liga se empareje con otro equipo de la liga
- Que un empujón corto y rápido cierre la hoja
- Que no se pueda falsificar la cookie de identidad de otro
- Que ningún diagnóstico "degradado" se quede sin decir cómo arreglarlo

### 10.2 Comentarios

En castellano, y explican **por qué**, nunca qué. Un comentario que describe lo
que ya dice el código sobra. Uno que explica una decisión —por qué se descartó la
alternativa, qué se rompió antes, qué pasa si alguien lo "simplifica"— vale oro.

Un comentario caducado justo donde se toma una decisión es **peor que ninguno**.
Si cambias el comportamiento, arregla el comentario en el mismo cambio.

### 10.3 El compilador de React es estricto

- **Nada impuro en el render**: ni `Date.now()`, ni leer `window`, ni leer
  `ref.current`. Mide con una *ref de callback* y guarda en estado.
- **Nada de `setState` síncrono dentro de un efecto.** Si necesitas reiniciar
  estado al cambiar algo, **remonta con `key`** en vez de resetear en un efecto.
- Dentro de una promesa (`.then`) sí se puede.

### 10.4 Seguridad

- Ningún secreto en el código. Todo por variables de entorno.
- Nunca aceptes ni manejes claves pegadas en un chat.
- Cookies de sesión: `httpOnly`, `Secure` en producción, `SameSite=Lax`.
- Una cookie que identifica va **firmada con HMAC**. Sin firma, cualquiera
  escribe el identificador de otro y se queda con su cuenta.
- Los valores que acaban dentro de una URL de redirección van por **lista
  blanca**. Con texto libre, un enlace preparado lleva a quien lo pulse a donde
  quiera quien lo preparó.
- PKCE + `state` en cualquier flujo OAuth. Comprueba el `code_challenge` contra
  el ejemplo publicado del RFC 7636.

---

## 11. Variables de entorno

```
SUPABASE_URL                  sesión persistente e histórico     (obligatoria)
SUPABASE_SERVICE_ROLE_KEY     solo servidor, nunca al navegador  (obligatoria)
SUPABASE_PUBLISHABLE_KEY      para el acceso con proveedor
SESSION_ENCRYPTION_KEY        AES-256-GCM, mín. 32 caracteres    (obligatoria)
APP_BASE_URL                  si el dominio no se deduce solo
```

Las credenciales de Google/Apple/Facebook **no van aquí**: van en el panel de
Supabase (Authentication → Providers).

Aviso: el plan gratuito de Supabase **pausa el proyecto** tras unos días sin
actividad. Pausado no responde, y la app cae al modo de sesión corta aunque las
variables estén puestas.

---

## 12. El objetivo final: piloto automático

**A dónde va el proyecto:** que la app pueda jugar sola mientras el usuario
duerme. Este es el destino, no el punto de partida.

### 12.1 Los dos pilotos, y por qué solo uno encaja

**Piloto que EJECUTA REGLAS (este es el que se construye).** El usuario escribe
las condiciones y la app las cumple:

> «Si la cláusula de un jugador mío queda a menos del 5 % de su valor, súbela.»
> «Si alguien pone en venta un portero por debajo de 4 M, puja 4,2 M.»
> «Nunca gastes más de 20 M sin preguntarme.»

Cada acción sale de **aritmética sobre datos oficiales**, se puede recalcular a
mano, y queda registrada junto a **la regla que la disparó**. La app no opina:
obedece. Por eso no rompe la §2 — no hay ningún número inventado por el camino.

**Piloto que DECIDE SOLO (no es el objetivo).** Elegir a quién fichar exige
comparar rendimientos futuros, o sea predecir, o sea inventar. Si alguna vez se
construye, cada cifra tiene que ir etiquetada como **estimación de esta app** y
nunca presentarse como dato. No es el camino por defecto.

### 12.2 Lo que hace falta para que funcione

- **Sesión que aguante sin el usuario delante.** Un piloto que se apaga cada 24 h
  no es un piloto: exige el modo `PERSISTENTE` de §5.3, con renovación
  automática. Sin eso, no se empieza.
- **Tarea programada** en el servidor que evalúe las reglas cada pocos minutos.
- **Registro de todo**: qué evaluó, qué disparó, qué hizo, y qué regla lo mandó.
  Sin esto es una caja negra moviendo dinero.

### 12.3 Frenos obligatorios

Las acciones de LALIGA **no se deshacen**. Un piloto sin límites es un piloto que
te vacía la caja a las tres de la mañana.

- **Modo ensayo** (por defecto al crear cualquier regla): dice qué *habría* hecho,
  sin hacerlo. Solo se activa de verdad cuando el usuario lo aprueba.
- **Tope de gasto** por operación y acumulado, configurable.
- **Parada de emergencia** siempre visible, que desactiva todo de golpe.
- **Aviso de cada acción ejecutada**, con su motivo.

### 12.4 Antes de activarlo

Automatizar acciones sobre el servicio de LALIGA es distinto de consultar datos.
Revisa sus términos de uso: es una decisión del dueño del proyecto, no del
código, y conviene tenerla resuelta antes de encender nada.

### 12.5 El camino hasta ahí

El piloto no es un salto: es el último escalón de una escalera que ya tiene los
primeros puestos.

1. Alertas que se consultan — **hecho**
2. Ejecutar acciones desde la app (pagar cláusula) — **hecho**
3. Alertas que avisan solas (§13.1) — es la misma maquinaria: cron + sesión que
   aguanta. Un piloto no es más que una alerta que, en vez de avisar, actúa.
4. Reglas escritas por el usuario, en modo ensayo
5. Reglas ejecutándose de verdad, con topes y parada

---

## 13. Lo que falta por construir

1. **Alertas que avisen de verdad.** Hoy se calculan al abrir la pantalla: no
   avisan, se consultan. Hace falta service worker + Web Push (VAPID) + tabla de
   suscripciones + tarea programada que recalcule en el servidor. En iOS solo
   funciona si la app está **instalada en la pantalla de inicio**. Es además el
   cimiento del piloto automático (§12.5).

2. **Estado de forma de varias fuentes** en la ficha del jugador (§4.5).

3. **Subir tu propia cláusula.** Sin confirmar que la API lo permita (§4.1). Es
   requisito de una de las reglas más obvias del piloto.

---

## 14. Criterios de aceptación

Antes de dar algo por terminado:

- [ ] `tsc --noEmit`, el linter, los tests y el build, los cuatro en verde
- [ ] Probado **en un navegador real a 390 px**, no solo compilado
- [ ] Sin desborde horizontal y sin errores de JavaScript en consola
- [ ] Cada número de la pantalla es identificable como dato, cálculo, dato
      incompleto o estimación
- [ ] Cada caso de "no se puede" explica **por qué**
- [ ] Cada color viene acompañado de una palabra
- [ ] Ningún dato que falta se ha rellenado con un cero ni con una media

Y si lo que has tocado automatiza algo (§12):

- [ ] Cada acción automática deja registrado **qué regla la disparó**
- [ ] Toda regla nueva nace en **modo ensayo**, nunca ejecutando
- [ ] Hay tope de gasto y parada de emergencia, y funcionan
- [ ] Ninguna decisión automática depende de un número que la app se haya
      inventado
