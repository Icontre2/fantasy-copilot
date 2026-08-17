# LigaLab — qué queremos construir

> Esto **no es** una lista de tareas. Es lo que queremos conseguir y por qué.
> El **cómo** es tuyo: si se te ocurre algo mejor que lo que sugerimos aquí,
> proponlo y explica por qué es mejor. Lo único cerrado son los principios (§2)
> y los hechos comprobados del anexo (§9).

---

## 1. El problema

Existe **LALIGA Fantasy**, el juego oficial de fantasy fútbol de España. Millones
de personas juegan ligas privadas con sus amigos: compran y venden jugadores con
dinero virtual, alinean once cada jornada y compiten por puntos.

Su app oficial sirve para jugar, pero **esconde justo lo que decide la partida**:

- **No sabes cuánto dinero tiene cada rival.** Y sin eso no sabes si pueden
  robarte a tu delantero pagando su cláusula, ni si puedes pujar tranquilo. Es la
  información más valiosa del juego y está oculta.
- **No te avisa de nada.** Un jugador tuyo se pone a tiro de cláusula y te
  enteras cuando ya no es tuyo. El mercado cierra y se te pasó.
- **No entiendes por qué sube o baja nadie.** Ves un número distinto cada día sin
  saber de dónde sale.
- **Te obliga a mirar.** Toda la información útil exige abrir la app y bucear.

Quien juega en serio acaba con una hoja de cálculo al lado. **Eso es el hueco.**

### 1.1 Quién lo va a usar

Una persona con el móvil en una mano, de pie, mirando algo rápido antes de que
cierre el mercado. No está sentada en un escritorio. No va a leer un tutorial.
Tiene treinta segundos y una pregunta concreta en la cabeza.

### 1.2 Qué queremos que sienta

- **«Ahora sé lo que pasa.»** Que se entere de lo que le afecta sin buscarlo.
- **«Esto no me está engañando.»** Que distinga siempre lo que es un dato de lo
  que es un cálculo, y que pueda comprobarlo si le da la gana.
- **«Llego a tiempo.»** Que la app le avise antes, no le informe después.
- **«Puedo despreocuparme.»** Y ese es el destino: que acabe jugando por él,
  siguiendo reglas que él mismo ha escrito (§4).

---

## 2. Los principios (esto sí es cerrado)

### 2.1 Si no lo sabemos, se dice

**Nunca rellenes un hueco.** Un dato que la API no publica no se sustituye por un
cero, ni por una media, ni por una estimación disfrazada.

Ejemplo real de lo que pasa cuando se incumple: LALIGA solo publica la caja del
usuario conectado; la de los rivales llega vacía. Una versión anterior hacía
`caja ?? 0` y lo presentaba como «Patrimonio total». Resultado: un rival con 30
millones guardados aparecía **idéntico** a uno arruinado. La app estaba afirmando
algo que no sabía, y encima con la información más importante del juego.

De cada número en pantalla tiene que poderse decir cuál de estas cuatro cosas es:

| | |
|---|---|
| **Dato oficial** | tal cual, sin adornos |
| **Cálculo nuestro** | con `≈` y la fórmula explicada en una línea |
| **Dato incompleto** | diciendo qué falta |
| **Estimación** | etiquetada como escenario, jamás como pronóstico |

### 2.2 Lo prohibido no es automatizar: es inventar

Prohibido inventarse un número y presentarlo como si se supiera. Nada de
«puntos esperados», «nota de fichaje» ni «puja máxima recomendada».

| Bien | Mal |
|---|---|
| Ejecutar reglas que escribe el usuario | Decidir por su cuenta qué le conviene |
| Aritmética sobre datos oficiales | Modelos que nadie puede comprobar |
| «Su valor está a un 4 % de la cláusula» | «Este jugador va a hacer 8 puntos» |

La prueba del algodón: **¿puede el usuario recalcular ese número a mano?** Si no,
no se enseña.

### 2.3 Las acciones que mueven dinero no se deshacen

Pagar una cláusula, pujar, vender: son irreversibles y con dinero de la partida.
Cualquier cosa que las toque necesita confirmación explícita, y cualquier
automatismo necesita frenos (§4.3).

### 2.4 Una parte rota no rompe la pantalla

Si falta un trozo de la respuesta, eso es un hueco con explicación — no una
pantalla en blanco. Ha pasado tres veces y las tres se llevó por delante una
sección entera.

---

## 3. Qué queremos que se pueda hacer

Esto son **objetivos**, no pantallas. Cómo se organicen es cosa tuya.

### 3.1 Saber quién puede hacerme daño
Que de un vistazo se vea qué rivales tienen dinero suficiente para pagar la
cláusula de mis jugadores. Hoy esto es invisible y es lo que más miedo da.

*Dificultad real:* LALIGA no publica la caja ajena. Sí publica el libro de
operaciones con importes exactos, así que se puede **reconstruir** — y entonces
hay que decir que es reconstruida y de qué saldo inicial se parte.

### 3.2 Enterarme antes de que sea tarde
Que la app avise **sola** cuando algo me afecta: un jugador mío a tiro de
cláusula, una puja que voy perdiendo, un jugador que se desploma.

Hoy hay que abrir la app y mirar. Queremos lo contrario.

### 3.3 Entender a un jugador sin salir de él
Que al tocar a cualquier jugador aparezca todo lo suyo: cuánto vale y cómo ha
evolucionado, cuánto puntúa, qué probabilidad tiene de ser titular, contra quién
juega y lo difícil que lo tiene, y qué dicen de él las páginas especializadas.

### 3.4 Actuar desde donde estoy
Que si veo una oportunidad pueda ejecutarla ahí mismo, sin cambiar de pantalla ni
de aplicación.

### 3.5 Entender la economía de mi liga
Quién ha ganado dinero, quién lo ha fundido, quién especula. Todo saliendo de
operaciones reales, no de sensaciones.

### 3.6 Preguntas abiertas — aquí queremos tus ideas

No tenemos respuesta y nos interesa la tuya:

- **¿Qué debería enseñar la pantalla de inicio?** Solo caben tres o cuatro cosas.
  ¿Cuáles son las que de verdad importan a alguien con treinta segundos?
- **¿Cómo se enseña la incertidumbre sin dar la turra?** Etiquetar cada número
  con su procedencia es la regla, pero llenar la pantalla de asteriscos la hace
  ilegible. ¿Cómo se resuelve con elegancia?
- **¿Qué otras señales serían útiles y siguen siendo datos, no inventos?**
- **¿Hay algo que la app oficial hace mal y no hemos visto?**
- **¿Qué haría que alguien la abriera todos los días?**

---

## 4. El destino: que juegue solo

El objetivo final es que la app **juegue por el usuario mientras duerme**.

### 4.1 La distinción que lo hace posible

**Un piloto que ejecuta reglas del usuario** encaja perfectamente con §2:

> «Si la cláusula de un jugador mío queda a menos del 5 % de su valor, súbela.»
> «Si sale un portero por debajo de 4 M, puja 4,2 M.»
> «Nunca gastes más de 20 M sin preguntarme.»

Cada acción es aritmética sobre datos oficiales, se puede recalcular, y queda
registrada junto a la regla que la disparó. **La app no opina: obedece.**

**Un piloto que decide solo** exige predecir rendimientos futuros, o sea
inventar. No es el camino. Si algún día se hace, cada cifra va etiquetada como
estimación de la app y nunca como dato.

### 4.2 Lo que está abierto

**Cómo escribe el usuario esas reglas es la pregunta más interesante del
proyecto, y no la tenemos resuelta.** ¿Lenguaje natural? ¿Bloques que se
encajan? ¿Plantillas que se rellenan? ¿Aprender de lo que ya hace a mano y
proponerle convertirlo en regla?

Tiene que poder escribirlas alguien que no programa, de pie, en un móvil. Danos
tu propuesta.

### 4.3 Frenos (esto no está abierto)

- **Modo ensayo por defecto**: toda regla nueva dice qué *habría* hecho, sin
  hacerlo, hasta que el usuario la active a conciencia.
- **Tope de gasto** por operación y acumulado.
- **Parada de emergencia** siempre visible.
- **Registro de todo**: qué evaluó, qué hizo y qué regla lo mandó. Sin esto es
  una caja negra moviendo dinero.

### 4.4 Antes de encenderlo

Automatizar acciones sobre el servicio de LALIGA no es lo mismo que consultar
datos. Revisar sus términos de uso es decisión del dueño del proyecto y conviene
tenerla resuelta antes, no después.

---

## 5. Cómo se siente la app

Dirección, no especificación. Si tienes una idea mejor que cumpla lo mismo,
proponla.

- **Móvil primero, una mano.** 390 px de referencia. Nunca desborde horizontal.
- **Oscura**, con acento violeta eléctrico. Superficies translúcidas con
  desenfoque, siempre con alternativa sólida para quien pide menos transparencia.
- **El color nunca explica solo.** Siempre acompaña una palabra: quien no
  distinga verde de rojo tiene que leer exactamente lo mismo.
- **Tarjetas, no tablas.** En un móvil una tabla es ilegible.
- **44 px de zona táctil** como mínimo. Nada de texto cortado.
- **Los gestos que la gente ya conoce**: deslizar una hoja hacia abajo para
  cerrarla, arrastrar el dedo por una gráfica para leer un punto. Y siempre con
  alternativa: un gesto sin botón deja fuera a quien usa teclado.

---

## 6. Cómo trabajar

- **Todo el peso en el servidor.** El navegador solo habla con nuestras rutas;
  ni tokens ni lógica ni llamadas a terceros desde el cliente.
- **Lo que se pueda decidir sin red, en su propio módulo y con tests.** Y que los
  tests prueben lo que puede salir mal de verdad, no que 2+2 sean 4: que un
  nombre ambiguo devuelva «no lo sé» en vez de emparejar mal; que nadie pueda
  falsificar la sesión de otro.
- **Los comentarios explican por qué, nunca qué.** Uno que describe lo que ya
  dice el código sobra. Uno que cuenta qué se rompió antes vale oro. Un
  comentario caducado donde se toma una decisión es peor que ninguno.
- **Probado en un navegador de verdad**, no solo compilado. Varios fallos serios
  de esta app solo aparecen tocándola.

---

## 7. Cómo está hoy (punto de partida, no techo)

Ya construido y funcionando: Next.js 16 + React 19 + TypeScript + Tailwind v4,
con Supabase para la sesión. Login contra LALIGA, caja y patrimonio de rivales
reconstruidos, alertas de cláusula, once probable propio y de rivales, mercado
con pujas, pagar cláusula, calendario con cuotas de casa de apuestas, economía de
la liga, comparador, exportación e instalable en el móvil.

**Nada de esto es intocable.** Si crees que algo está mal planteado, dilo.

Lo que falta: que las alertas avisen solas, el estado de forma de varias fuentes,
subir la cláusula propia, y el piloto automático (§4).

---

## 8. Lo que esperamos de ti

1. **Discute el planteamiento antes de escribir código.** Si algo de §3 te parece
   mal enfocado, dilo.
2. **Propón lo que no se nos ha ocurrido.** Especialmente en §3.6 y §4.2.
3. **Respeta §2 sin excepciones.** Es la identidad del producto: si se rompe, esto
   es una app más que se inventa números bonitos.
4. **Si dudas entre enseñar un hueco honesto o un número cómodo, hueco.**

---

# ANEXO — Hechos comprobados

> Esto **no es diseño y no está abierto a interpretación**: son cosas verificadas
> contra las APIs reales. Ignorarlas cuesta días de depuración.

## 9.1 LALIGA Fantasy: hay dos hosts y uno está obsoleto

| Host | Qué sirve |
|---|---|
| `api-fantasy.llt-services.com` | temporada **anterior** — no usar |
| `fantasy-api.llt-services.com` | temporada **en curso** |

Varios endpoints del host bueno responden **200 sin token**: catálogo, calendario,
jornada actual, cotizaciones. Los datos de tu liga sí piden `Bearer`.

**Descubrir endpoints por código de estado:** `401` existe y pide auth · `404` no
existe · `405` existe pero no con ese método (mira la cabecera `Allow`) · `403`
un filtro te bloquea y **no puedes concluir nada**.

Base `/api/v1/competition/1`:

```
GET  /week/current                        jornada actual   (sin token)
GET  /calendar?weekNumber=N               partidos         (sin token)
GET  /players                             catálogo         (sin token)
GET  /league/{id}/teams                   plantillas       (token)
GET  /league/{id}/activity                operaciones con importes exactos
GET  /league/{id}/market                  mercado          (token)
POST /league/{id}/buyout/{playerId}/pay   pagar cláusula   (token)
GET  /league/{id}/buyout/{playerId}       solo lectura — responde `Allow: GET`
```

**Subir la cláusula propia no está expuesta**: `/edit`, `/update` y `/set` dan
404. Antes de prometer esa función, mira qué llama la web oficial
(`laligafantasy.relevo.com`).

## 9.2 Trampas que ya nos han mordido

- **Zod descarta las claves que no declaras.** Tiró campos reales dos veces, sin
  ningún error.
- **`teamId` viene plano, no anidado** (verificado: 792 de 792 jugadores).
- **Un partido sin jugar trae marcador `null`, no `0`.** Si lo normalizas a cero,
  la pantalla no puede distinguir un 0-0 real de un partido sin empezar.
- **Fuera de las jornadas 1–38 la API responde 500.**

## 9.3 Cuotas de apuestas

`football-data.co.uk/fixtures.csv` — CSV abierto, **sin clave ni registro**.
Filtra `Div == "SP1"`. Prefiere `B365*` (casa concreta y citable); si falta, usa
`Avg*` y **di que es una media**, no la hagas pasar por una casa.

Solo trae partidos que las casas ya tienen abiertos. Uno de dentro de tres meses
no tiene cuotas en ningún sitio: enséñalo sin ellas y explícalo.

Tarda un par de días en soltar los ya jugados, así que verás cuotas junto a
marcadores cerrados: etiquétalas **«cuotas previas al partido»**.

Nombres que no coinciden (sacados de sus propios ficheros, no de suposiciones):

```
"Ath Bilbao" → Athletic Club      "Espanol"       → RCD Espanyol de Barcelona
"Ath Madrid" → Atlético de Madrid  "Dep. A Coruna" → RC Deportivo
```

**El emparejamiento es la pieza peligrosa**: si falla, enseñas las cuotas de otro
partido y no se nota mirando. Exacto primero, contención después; si encajan dos,
devuelve «no lo sé». Un hueco se ve, un cruce equivocado no.

Palabras de relleno: `cf, fc, rc, cd, ud, sd, ca, rcd, club, de, the`. **«Real» y
«Deportivo» NO son relleno**: sin «Real», el Real Madrid queda en «madrid», que
está dentro de «Atletico Madrid», y el derbi se vuelve ambiguo. Lo cazó un test.

## 9.4 Fuentes descartadas

- **BeSoccer**: 406 a `curl`, corta la conexión a un navegador automatizado,
  página anti-bot al lector web. Una fuente que no se puede probar es una fuente
  que se rompe en silencio.
- **The Odds API**: funciona pero exige registro y clave, innecesario habiendo un
  CSV abierto.

**Sí responden** (200, agosto 2026): `analiticafantasy.com`,
`jornadaperfecta.com`. **Nunca promedies fuentes**: un 7,2 de una y un 6,8 de
otra no dan un «7,0» — ese número no existe en ningún sitio.

## 9.5 Autenticación: son dos accesos distintos

**A LigaLab** (opcional): Google/Apple/Facebook vía Supabase Auth, flujo PKCE
**del lado del servidor**. Los proveedores a enseñar se sacan preguntando a
Supabase (`/auth/v1/settings`), no de variables de entorno: así activar uno en su
panel hace aparecer su botón sin desplegar.

**A LALIGA** (imprescindible): Azure AD B2C.
- Email + contraseña: *Resource Owner Password Credentials*.
- **Cuentas sociales de LALIGA no tienen contraseña en B2C.** Necesitan
  *Authorization Code + PKCE* contra `authredirect://com.lfp.laligafantasy`, que
  es de la app oficial. Desde una web es imposible (B2C responde `AADB2C90006` a
  cualquier redirect no registrado), pero **sí funciona desde un contenedor iOS**
  con `ASWebAuthenticationSession`, que entrega el callback solo a la sesión que
  lo abrió.

**`AADB2C90225` no distingue** una contraseña equivocada de una cuenta social:
devuelve lo mismo en ambos casos. El mensaje tiene que contar **las dos
posibilidades**; mandar a alguien a cambiar una contraseña que estaba bien es
peor que decirle que hay dos motivos.

## 9.6 La sesión, y el fallo que no se ve

El token nunca sale del servidor; al navegador va una cookie `httpOnly` con un id
opaco, y los tokens se cifran con AES-256-GCM.

| Modo | Cuándo | Dura |
|---|---|---|
| Persistente | base de datos + clave fija | 30 días, se renueva sola |
| Clave inestable | base de datos, clave derivada de algo que rota | hasta el siguiente despliegue |
| Solo cookie | sin base de datos | ~24 h |

**El traicionero es el segundo.** Si derivas la clave de un token que la
plataforma rota, por dentro todo parece correcto —cifra, guarda— pero al rotar,
las sesiones dejan de poder descifrarse. El síntoma es «la app me echa cada dos
por tres» **sin un solo error en ningún log**. Por eso la pantalla de acceso
enseña el diagnóstico cuando la sesión va a durar poco: ese es justo el momento
en que a alguien le interesa saberlo.

Aviso: el plan gratuito de Supabase **pausa el proyecto** tras unos días sin
actividad, y pausado no responde.

## 9.7 Detalles que solo aparecen probando de verdad

**Al soltar el dedo de un gesto**, el evento de subida llega con **las mismas
coordenadas** que el último movimiento. Si mides la velocidad hasta él, siempre
da cero, y un empujón rápido no cierra nunca. Mide entre dos muestras de
*movimiento*, sobre una ventana de ~30 ms.

**Un gesto rápido dispara mover y soltar antes de que React vuelva a pintar.** Si
la condición «se está arrastrando» vive solo en estado, al soltar todavía dice
que no y el gesto se descarta. Guárdala en una `ref`.

**Una hoja deslizable no debe pelear con el scroll**: el arrastre solo empieza si
el contenido ya está arriba del todo. Sin ese matiz se cierra sola cada vez que
intentas leer.

**Comprueba la forma de lo que vas a usar, no solo que el objeto exista.**
`data?.lista.length` protege que falte `data`, pero no que llegue sin `lista`.
Eso tumbó una pantalla entera.

## 9.8 El compilador de React es estricto

- Nada impuro en el render: ni el reloj, ni `window`, ni `ref.current`.
- Nada de `setState` síncrono dentro de un efecto — para reiniciar estado,
  remonta con `key`. Dentro de una promesa sí se puede.

## 9.9 Seguridad

- Ningún secreto en el código; todo por variables de entorno.
- Cookies de sesión `httpOnly` + `Secure` + `SameSite=Lax`.
- Una cookie que identifica va **firmada**. Sin firma, cualquiera escribe el
  identificador de otro y se queda con su cuenta.
- Lo que acabe dentro de una URL de redirección va por **lista blanca**. Con
  texto libre, un enlace preparado lleva a quien lo pulse a donde quiera quien lo
  preparó.
