# PRODUCT TRUTH — qué es LigaLab HOY

> **Regla de esta carpeta.** Nada de aquí se anuncia si no está en la sección
> «Funciona hoy». Lo demás se puede enseñar como roadmap, dicho como roadmap.
>
> Verificado el **2026-08-19** contra el despliegue real
> (`https://fantasy-copilot-sigma.vercel.app`), no contra el código. Es una
> distinción que ya nos ha mordido: hay funciones que existen en el repositorio
> y están **apagadas en producción**.

---

## 0. El bloqueo que condiciona todo el plan

`docs/AUDITORIA_FASE_1.md` §0, marcado por el propio proyecto como *bloqueante,
no técnico*:

> Las condiciones de LALIGA limitan el uso al **ámbito personal/privado** y piden
> **consentimiento escrito para uso comercial**; no hay autorización explícita de
> la API privada para terceros.

Todo lo que hay en `/marketing` es uso comercial. **El riesgo no es una multa: es
que LALIGA corte el acceso a su API privada y la app deje de funcionar para
todos, de un día para otro.** Toda la máquina de contenido depende de que esos
datos sigan llegando.

Precedente observado (no es permiso): FantasyStats publica el descargo *«No está
afiliada, asociada ni respaldada por LALIGA Fantasy»* y opera en Google Play. Que
otros lo hagan no autoriza a hacerlo; solo dice que el ecosistema existe y que
LALIGA no lo ha cerrado hasta la fecha de esta auditoría.

**Acción previa a cualquier campaña de pago o lanzamiento en tiendas:** pedir por
escrito a LALIGA la autorización comercial. Ver `STRATEGY.md`, sección 1.

---

## 1. Funciona hoy — se puede anunciar

Verificado en producción con sesión real.

| Función | Qué hace exactamente | Dónde |
| --- | --- | --- |
| **Alertas de cláusula** | Para cada jugador de tu liga: hueco hasta la cláusula, subida media diaria, días estimados a ese ritmo, si está blindado y hasta cuándo. Ordenadas por **cuándo puedes fichar**: primero las abiertas, luego por plazo creciente | `AlertsView` |
| **Pagar la cláusula** | Desde la propia tarjeta, con confirmación escrita de la cifra. El servidor revalida cláusula y propietario antes de pagar | `/players/[id]/buyout` |
| **Caja de rivales reconstruida** | 100 M€ iniciales + historial completo de operaciones paginado + ingresos por puntos. Se marca con `≈` cuando es estimación | `economy/activity.ts` |
| **Caja propia oficial** | La que publica LALIGA para tu equipo. Exacta | `dashboard` |
| **Evolución de valor** | Cotización oficial diaria por jugador y sumada de la plantilla. Periodos 1D / 3D / 7D / 30D / todo, desde el 1 de agosto. Se recorre con el dedo | `SquadValueHistory`, `DashboardView` |
| **Once probable propio y de cada rival** | Porcentajes de titularidad de FútbolFantasy colocados en una formación válida | `probable-lineup.ts` |
| **Ficha de competidor** | Se toca un rival en Inicio y sale su once, su plantilla entera y su evolución | `ManagerSheet` |
| **Mercado con pujas reales** | Crear, modificar y cancelar puja. Filtros por posición y procedencia, ordenaciones | `MarketView`, `/market/[id]/bid` |
| **Economía de la liga** | Compras, ventas, cláusulas pagadas e ingresos por puntos, manager a manager | `EconomyView` |
| **Comparador** | Dos jugadores: valor, cláusula, media, puntos, propietario y evolución | `CompareView` |
| **Puntos por jornada** | Del once, con selector de jornada. Solo se ofrecen jornadas que constan | `MySquadView` |
| **Calendario con dificultad** | Cuotas 1X2 reales de football-data.co.uk convertidas en dificultad por equipo | `CalendarView`, `team-difficulty.ts` |
| **Exportar CSV** | Plantillas de la liga y mercado actual | `ExportView` |
| **Instalable en iPhone** | Manifiesto, pantalla completa, icono, pantalla propia sin conexión | `manifest.ts`, `sw-app.js` |

### La regla de honestidad, que es un activo de marketing

- Un dato ausente se dibuja **`—`, nunca `0`**.
- Una estimación lleva **`≈`** y explica su método en pantalla.
- Cuando no hay tendencia, la tarjeta dice **por qué** (sin histórico / congelado
  / el valor no sube), en vez de dejar dos guiones.

---

## 2. Construido pero APAGADO en producción — **no anunciar**

Existe el código, está desplegado, y **no funciona** por configuración ausente.
Verificado con `curl` el 2026-08-19:

| Función | Estado real | Qué falta |
| --- | --- | --- |
| **Avisos push** | `/api/fantasy/push/status` → `{"disponible": false}` | Claves VAPID + sesión persistente |
| **Cron diario de alertas** | `/api/cron/alerts` → **501 `CRON_SECRET no está configurado`** | `CRON_SECRET` en Vercel |
| **Entrar con Google / Apple / Facebook** | `/social/start?provider=google` → **501 «no está configurado»** | Variables de Supabase + proveedores en su panel |
| **Sesión persistente de 30 días** | `modo: SOLO_COOKIE` — dura ~24 h | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SESSION_ENCRYPTION_KEY` |

> ⚠️ **«Te avisa sola» NO se puede anunciar todavía.** Es la combinación de push +
> cron, y las dos están muertas. Ya se coló esta afirmación en una página de
> presentación enviada a usuarios reales; corregida el 2026-08-19.

Detalle en [`../docs/AYUDA_ACCESO_SOCIAL.md`](../docs/AYUDA_ACCESO_SOCIAL.md) y
en la issue #26.

---

## 3. No existe — roadmap, etiquetado como tal

Nada de esto está construido. Se puede prometer como futuro, nunca insinuar como
presente.

| Idea | Por qué importa para marketing | Coste aproximado |
| --- | --- | --- |
| **Rankings globales** («top subidas 24h», «acelerando», «frenando») | Es el **motor de contenido diario**. Sin esto no hay fábrica automática | Medio. Los datos existen (`/players` + histórico); falta agregarlos y una pantalla |
| **Tarjetas compartibles** («mi plantilla vale X») | Es el bucle viral. Hoy no hay nada que compartir desde el producto | Medio |
| **Lesiones y sanciones** | Lo tienen los competidores; es una laguna evidente | Medio-alto, hace falta fuente |
| **Simulador de subida de cláusula** | LALIGA deja subirla hasta el 400% y cuesta dinero. Decisión recurrente sin herramienta | Bajo-medio |
| **Analytics de producto** | Hoy **no se mide nada**. Sin esto, el punto 16 del brief no se puede ejecutar | Bajo |
| **Waitlist / captura de correo** | No existe. Sin esto no hay pre-lanzamiento | Bajo |
| **Multi-plataforma** (Biwenger, Mister, Comunio) | Los competidores cubren varias; LigaLab solo LALIGA Fantasy | Alto |

---

## 4. De dónde salen los datos

| Fuente | Qué aporta | Riesgo |
| --- | --- | --- |
| **API privada de LALIGA Fantasy** | Ligas, plantillas, mercado, valores, cláusulas, actividad, caja propia | **Alto.** No documentada, sin autorización de terceros. Es el bloqueo §0 |
| **FútbolFantasy** (scraping) | Porcentajes de titularidad y onces probables | **Alto.** Es scraping, y además **es un competidor directo**: dependemos de un rival |
| **football-data.co.uk** (CSV) | Cuotas 1X2 → dificultad | Bajo. Abierto, sin clave |

**Dependencia incómoda que hay que decir en voz alta:** la función «once probable»
depende de raspar a un competidor (FútbolFantasy, que tiene su propia app). Si
cambian el HTML o lo bloquean, esa función cae.

---

## 5. Limitaciones reales

1. **Necesitas cuenta de LALIGA Fantasy y estar en una liga.** No hay modo
   demo ni onboarding para curiosos. Todo el tráfico que no juegue ya, rebota.
2. **Solo LALIGA Fantasy.** Ni Biwenger, ni Mister, ni Comunio, ni Fantasy Marca.
3. **Si tu cuenta de LALIGA se creó con Google/Apple/Facebook, no puedes entrar**
   por email y contraseña — esa cuenta no tiene contraseña. Queda la vía de pegar
   el token, que es incómoda. **Esto tumba a una parte desconocida pero
   probablemente grande del tráfico.** Es el arreglo más urgente antes de captar.
4. **La sesión dura ~24 h.** Cada usuario vuelve a meter su contraseña a diario.
5. **La curva de plantilla mira hacia atrás con la plantilla de hoy**: un fichaje
   reciente aparece como si siempre hubiera estado. Se dice en pantalla.
6. **La caja ajena es estimación** salvo que LALIGA la publique.
7. **No hay analítica.** No sabemos cuánta gente entra ni qué usa.
8. **Sin política de privacidad ni términos.** Con usuarios reales ya dentro, es
   una laguna legal, no solo una tarea pendiente.

---

## 6. Ventaja competitiva real, sin autoengaño

Comparado con lo que se ha podido verificar de la competencia (ver
`research/COMPETITORS.md`):

**No es diferencial** — otros ya lo hacen:
- Analizar oportunidades de cláusula en rivales (FantasyStats).
- Onces probables y porcentajes (FútbolFantasy, Analítica Fantasy).
- Comparador, mercado, valores (todos).
- Calculadora de cláusula y puja (Analítica Fantasy).

**Sí parece diferencial** — no se ha encontrado equivalente:
1. **La caja reconstruida de cada rival**, con método explicado. Nadie más lo
   anuncia. Es *la* función que responde «¿puede permitirse quitarme a este?».
2. **Ejecutar dentro de la app**: pagar cláusula y pujar de verdad, no solo mirar.
3. **La disciplina de no inventar.** Ningún competidor renuncia a recomendar.

**Y la contrapartida, que hay que asumir:** esa disciplina también es una
**carencia comercial**. Los competidores ofrecen «recomendaciones de fichaje» y
«estimación de puntos», que es lo que mucha gente quiere. Vendemos no dárselo. Eso
solo funciona si el mensaje es *«los demás se lo inventan»*, y ese mensaje hay que
poder sostenerlo sin difamar a nadie: se sostiene explicando **nuestro** método,
no atacando el suyo.

---

## 7. Lo que NO podemos decir

- ❌ «Te avisa sola» / «alertas automáticas» → apagado en producción.
- ❌ «Entra con Google» → no configurado.
- ❌ «Sabemos el dinero exacto de tus rivales» → es **estimación**, y se dice.
- ❌ «Te decimos a quién fichar» → el producto se niega por diseño.
- ❌ «Predecimos puntos / valores» → prohibido por la regla del proyecto.
- ❌ «Oficial», «de LALIGA», o cualquier cosa que sugiera vínculo → no lo hay, y
  además es el camino más rápido a que nos cierren.
- ❌ Cifras de usuarios, descargas o resultados → **no hay analítica**; cualquier
  número sería inventado.
