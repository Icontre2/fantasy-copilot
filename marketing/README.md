# /marketing — sistema de crecimiento de LigaLab

Auditado y escrito el **2026-08-19** contra el producto real, no contra el
código. Todo lo que se afirma aquí sobre el producto está verificado en
producción; todo lo que se afirma sobre la competencia dice si está verificado o
no.

---

## ⚠️ Lee esto antes que nada

**1. Hay un bloqueo legal sin resolver.** Las condiciones de LALIGA limitan el uso
al ámbito personal y exigen consentimiento escrito para uso comercial. Todo este
plan es uso comercial. Si LALIGA corta el acceso, la app se apaga entera.
→ `STRATEGY.md` §1.1

**2. Hay tres fugas que hacen inútil cualquier campaña hoy:**
- Las cuentas de LALIGA creadas con Google/Apple/Facebook **no pueden entrar**.
- **No hay analítica**: no se puede medir nada.
- **No hay política de privacidad** y ya hay usuarios reales.

**3. Tres funciones están construidas pero APAGADAS en producción**: avisos push,
el cron diario de alertas y el acceso social. **No se pueden anunciar.**

---

## Por dónde empezar

| Si quieres… | Lee |
| --- | --- |
| Saber qué es verdad del producto | **`PRODUCT_TRUTH.md`** ← empieza aquí |
| Entender el posicionamiento y los riesgos | `STRATEGY.md` |
| Saber qué hacer las próximas 12 semanas | `90_DAY_PLAN.md` |
| Publicar algo mañana | `CONTENT_CALENDAR_30D.md` |
| Entender cómo se produce | `CONTENT_ENGINE.md` |
| Aprobar o rechazar una pieza | **`APPROVAL_PANEL.md`** · panel en `/marketing` |

## Índice

```
marketing/
├── README.md                     este archivo
├── PRODUCT_TRUTH.md              qué funciona, qué está apagado, qué no existe
├── STRATEGY.md                   bloqueos, usuario, posicionamiento, riesgos
├── 90_DAY_PLAN.md                12 semanas priorizadas
├── CONTENT_ENGINE.md             1 insight → 6 piezas
├── APPROVAL_PANEL.md             panel privado /marketing: cómo funciona
├── CONTENT_CALENDAR_30D.md       30 días concretos
├── SEEDANCE_PIPELINE.md          vídeo · APIs verificadas
├── IMAGE_PIPELINE.md             carruseles y tarjetas
├── ASO.md                        tiendas: keywords y ficha
├── INFLUENCERS.md                micro-creadores y comunidad
├── ANALYTICS.md                  North Star, embudo, eventos
├── app-launch/
│   └── APP_STORE_PLAN.md         12 fases + riesgos de rechazo
├── research/
│   ├── PAIN_POINTS.md            dolores, con su evidencia
│   ├── COMPETITORS.md            lo verificado y lo que no
│   └── CONTENT_OPPORTUNITIES.md  dónde hay hueco
└── content/
    └── ideas.json                104 ideas · 99 producibles hoy
```

## Las 15 preguntas del encargo

| # | Pregunta | Respuesta corta | Detalle |
| --- | --- | --- | --- |
| 1 | ¿Quién es el usuario? | Quien juega en **liga privada con amigos**, mira la app a diario y ya usa 2-3 herramientas | `STRATEGY.md` §2 |
| 2 | ¿Qué problema urgente? | «¿Puede mi rival pagar la cláusula de mi jugador?» | `PAIN_POINTS.md` B1/B2 |
| 3 | ¿Por qué LigaLab? | Es la única que reconstruye **la caja del rival**. Y no inventa nada | `STRATEGY.md` §3 |
| 4 | ¿Qué publicamos mañana? | Día 1 del calendario | `CONTENT_CALENDAR_30D.md` |
| 5 | ¿Cómo se produce? | 1 insight → guion → Seedance → revisión humana | `CONTENT_ENGINE.md` |
| 6 | ¿Cómo se distribuye? | TikTok, Reels, Shorts, carrusel, X | `CONTENT_ENGINE.md` §2 |
| 7 | ¿Qué se automatiza? | Guion y render sí. **TikTok no** (exige auditoría) | `SEEDANCE_PIPELINE.md` §2 |
| 8 | ¿Cómo se mide? | North Star: **3 de cada 7 días viendo alertas**. Hoy no se mide nada | `ANALYTICS.md` |
| 9 | ¿Primeros 100? | Ya está pasando: ligas propias y amigos | `STRATEGY.md` §5 |
| 10 | ¿Primeros 1.000? | Orgánico + comunidad + micro-creadores | `STRATEGY.md` §5 |
| 11 | ¿Primeros 10.000? | Tiendas + bucle viral. **No alcanzable con el producto de hoy** | `STRATEGY.md` §5 |
| 12 | ¿Cómo entramos en las tiendas? | Capacitor con el front empaquetado. 12 fases | `app-launch/APP_STORE_PLAN.md` |
| 13 | ¿Primeras reseñas? | Amigos + petición tras un momento bueno | `ASO.md` §4 |
| 14 | ¿Posicionamiento en búsqueda? | Por la cola larga; `cuánto dinero tiene mi rival` no la trabaja nadie | `ASO.md` §2 |
| 15 | ¿Qué construir para crecer? | Login social, analítica, push, tarjetas compartibles, rankings | `STRATEGY.md` §6 |

## Las cuatro cosas de esta semana

1. ✉️ **Escribir a LALIGA** pidiendo la autorización comercial. Cuesta un correo.
2. 🔧 **Arreglar el login social** (issue #26).
3. 📊 **Instalar PostHog** con `login_started` / `login_completed` / `login_failed`.
4. 🔔 **Encender push y cron** — el `CRON_SECRET` no está puesto.

Juntas son menos de una semana de trabajo y desbloquean todo lo demás.

---

## Cómo se mantiene esto vivo

- **`PRODUCT_TRUTH.md` se actualiza cada vez que una función cambia de estado.**
  Es la fuente de verdad: si miente, el marketing miente.
- Ninguna pieza se produce si su función no está en «Funciona hoy».
- Las métricas se vuelcan al JSON de cada pieza, semanalmente.
- Con menos de 30 piezas no se cambia la estrategia: eso es ruido, no señal.
