# Analítica y métricas

> **Punto de partida honesto: hoy no se mide NADA.** No hay analítica de producto.
> No sabemos cuánta gente entra, ni qué pantalla usa, ni dónde abandona.
>
> Sin esto, el punto 17 del encargo —«que el sistema aprenda qué funciona»— es
> imposible. **Es la primera tarea de esta carpeta.**

---

## 1. North Star Metric

> **Managers que consultan una alerta de cláusula al menos 3 días de cada 7.**

Por qué esta y no otra:
- **No son descargas** — se descarga y se abandona.
- **No son usuarios activos diarios** — abrir no es usar.
- Captura las tres cosas a la vez: hábito (3 de 7), la función que de verdad
  diferencia (cláusulas), y valor real (mirarla es estar decidiendo).

**Métrica de contrapeso:** % de sesiones que acaban en error o en pantalla vacía.
Si sube, estamos creciendo sobre una experiencia rota.

---

## 2. Embudo

| Etapa | Evento | Dónde se mide | Hoy |
| --- | --- | --- | --- |
| Impresión | — | Plataforma social | ❌ |
| Vista de vídeo | — | Plataforma | ❌ |
| Visita al perfil | — | Plataforma | ❌ |
| Visita al sitio | `landing_view` | Producto | ❌ |
| Intento de acceso | `login_started` | Producto | ❌ |
| **Acceso completado** | `login_completed` | Producto | ❌ |
| **Fallo de acceso** | `login_failed` + motivo | Producto | ❌ **Crítico** |
| Liga cargada | `league_loaded` | Producto | ❌ |
| **Activación** | `alert_viewed` | Producto | ❌ |
| D1 / D7 / D30 | `session_start` | Producto | ❌ |

> **`login_failed` con el motivo es el evento más valioso de la lista.** Es donde
> vamos a descubrir cuánta gente rebota por tener cuenta de Google/Apple/Facebook
> (dolor E1). Hoy ese número es una incógnita total, y de él depende si merece la
> pena gastar en captación.

---

## 3. Eventos mínimos

```
# Acceso
login_started        { metodo: "password" | "token" | "social" }
login_completed      { metodo }
login_failed         { metodo, codigo }   ← codigo: AADB2C90225, etc.
logout

# Activación
league_loaded        { n_managers }
alert_viewed         { n_alertas, n_abiertas }
competitor_opened
squad_viewed
market_viewed
player_compared
value_history_range  { rango }

# Acciones de valor
buyout_confirmed     { exito: bool }
bid_placed           { accion: "crear"|"modificar"|"cancelar" }

# Instalación y avisos
pwa_installed
push_enabled / push_disabled

# Viral (cuando exista)
share_generated      { tipo }
```

**Nunca registrar:** tokens, contraseñas, correos, ni nombres de managers. Los
eventos llevan un id anónimo por instalación, no la identidad de LALIGA.

---

## 4. Qué herramienta

| Opción | Coste | Pega | Veredicto |
| --- | --- | --- | --- |
| **Vercel Web Analytics** | Gratis hasta cierto punto | Solo páginas, sin eventos ricos | Para empezar hoy |
| **PostHog Cloud** | Gratis hasta 1 M eventos/mes | Hay que instalarlo | ✅ **Recomendado** |
| Plausible | ~9 $/mes | Eventos limitados | Alternativa simple |
| GA4 | Gratis | Pesado, y con RGPD obliga a banner de cookies | ❌ |

**PostHog** permite embudos, retención y grabaciones, y su plan gratuito sobra
para este tamaño. Se puede autoalojar si el RGPD aprieta.

⚠️ **Con RGPD:** la analítica de producto puede ir por interés legítimo **si es
mínima y no rastrea entre sitios**. En cuanto haya marketing o rastreo, hace falta
consentimiento previo. Ver la conversación sobre privacidad.

---

## 5. Aprender del contenido

Cada pieza registra lo suyo en su JSON. Con **30-50 piezas** empiezan a verse
patrones:

| Dimensión | Qué se compara |
| --- | --- |
| Estructura | E1…E10 — cuál retiene |
| Pain point | A/B/C/D — cuál convierte |
| Duración | Tramos de 5 s |
| Hora | Franjas |
| Función mostrada | Cuál genera clic |
| CTA | Enlace vs comentario vs perfil |

**Con menos de 30 piezas no hay señal, hay ruido.** No cambies la estrategia por
un vídeo que funcionó.

---

## 6. Cuadro de mando semanal

Seis números, una vez por semana, en una hoja:

1. Piezas publicadas
2. Visualizaciones totales y mediana *(la mediana importa más: la media la
   distorsiona un viral)*
3. Visitas al sitio
4. **Accesos completados / accesos intentados** ← la fuga
5. Activación (alerta vista / acceso completado)
6. North Star: managers con 3 de 7 días

---

## 7. Orden de implantación

1. **PostHog + `login_started` / `login_completed` / `login_failed`** — un día de
   trabajo, y contesta la pregunta más cara que hay abierta.
2. Eventos de activación.
3. Retención D1/D7/D30.
4. Acciones de valor.
5. Bucle viral, cuando exista.
