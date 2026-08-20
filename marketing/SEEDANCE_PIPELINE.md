# Pipeline de vídeo — Seedance

> **Verificado el 2026-08-19 por búsqueda web.** Lo que aquí se afirma sobre APIs
> viene de documentación pública consultada ese día; las plataformas cambian sus
> reglas a menudo, así que **antes de construir la integración, vuelve a
> comprobarlo**.

---

## 1. Qué existe de verdad

### Seedance (ByteDance)

| | |
| --- | --- |
| Modelo | Seedance 2.0 (marzo 2026) · **2.5 con API pública desde el 7 de agosto de 2026** |
| Acceso | Plataforma oficial de ByteDance · **fal.ai** (desde abril 2026) · PiAPI · Dreamina (consumidor) |
| Entradas | Texto, imagen, audio y vídeo |
| Salida | Hasta **15 segundos**, 1080p |
| Precio | Desde **~0,05 $ por vídeo de 5 s a 720p** vía terceros |

**Lectura:** 15 segundos encaja exactamente con el formato objetivo (9-15 s). Y a
0,05 $ por render, **el coste no es el problema**: 5 piezas diarias durante un mes
son unos 7,50 $. El cuello de botella es el criterio y la revisión, no el
presupuesto.

**Ruta recomendada:** empezar por **fal.ai**, que lleva más tiempo con API estable
y no exige cuenta de empresa china.

### Publicación

| Plataforma | ¿Automatizable? | Realidad |
| --- | --- | --- |
| **TikTok** | ⚠️ **SEMI** | La Content Posting API exige **una auditoría aparte** de la alta de desarrollador. **Hasta pasarla, todo post directo es `SELF_ONLY`** — solo lo ves tú. La auditoría tarda de días a dos semanas. Alternativa mientras tanto: *Upload to Inbox*, que deja el vídeo en tu bandeja de TikTok y tú das al botón |
| **Instagram Reels** | ✅ **AUTOMATIZABLE** | Tres pasos: `POST /{ig-user-id}/media` con `media_type=REELS` y una `video_url` pública → sondear `status_code` hasta `FINISHED` → `POST /media_publish`. Exige cuenta **Business**, 9:16, 5-90 s, H.264/HEVC |
| **YouTube Shorts** | ❓ **Sin verificar** | No comprobado en esta investigación. No diseñes contando con ello hasta mirarlo |
| **X / Threads** | ❓ **Sin verificar** | Ídem |

> **Consecuencia incómoda:** TikTok es tu plataforma prioritaria y es la **menos**
> automatizable de entrada. Planifica TikTok como semi-manual durante al menos el
> primer mes.

---

## 2. Clasificación honesta del pipeline

| Etapa | Estado | Cómo |
| --- | --- | --- |
| Detección de insight | ⚠️ **MANUAL hoy** | Automatizable cuando existan rankings globales |
| Selección de pain point | ✅ AUTOMATIZABLE | Tabla de `PAIN_POINTS.md` + reglas |
| Generación de hook | ✅ AUTOMATIZABLE | LLM con las 10 estructuras |
| Guion y storyboard | ✅ AUTOMATIZABLE | LLM con plantilla |
| Prompts visuales | ✅ AUTOMATIZABLE | LLM |
| Render de vídeo | ✅ AUTOMATIZABLE | Seedance vía fal.ai |
| Captura del producto | ⚠️ SEMI | Playwright contra una liga de prueba |
| Montaje y overlays | ⚠️ SEMI | ffmpeg programable; el criterio no |
| **Revisión** | 🔴 **MANUAL, obligatoria** | Ver `CONTENT_ENGINE.md` §4 |
| Publicación Reels | ✅ AUTOMATIZABLE | Graph API, cuenta Business |
| Publicación TikTok | ⚠️ SEMI | Inbox + toque humano, hasta pasar auditoría |
| Métricas | ⚠️ SEMI | Lectura por API donde exista; a mano donde no |

---

## 3. El JSON de cada pieza

```json
{
  "id": "LL-2026-001",
  "fecha": "2026-08-20",
  "pain_point": "B1",
  "estructura": "E3",
  "hook": "Crees que tu rival no tiene dinero.",
  "feature": "caja reconstruida",
  "feature_estado": "funciona",
  "format": "video",
  "duracion_s": 12,
  "platforms": ["tiktok", "reels", "shorts"],
  "dato_real": { "fuente": "captura 2026-08-20", "verificado_por": "manual" },
  "seedance": { "modelo": "2.5", "escenas": 4, "coste_usd": 0.12 },
  "status": "borrador",
  "revisado_por": null,
  "published_urls": [],
  "views": null, "likes": null, "comments": null,
  "shares": null, "saves": null, "clicks": null, "installs": null
}
```

`feature_estado` es obligatorio y solo admite `funciona`. Si una idea apunta a una
función apagada o de roadmap, **no se produce**: es la barrera que impide repetir
el error de anunciar «te avisa sola».

---

## 4. Plantilla de guion

```
ESCENA 1 · 0-2s   HOOK. Texto grande. Sin marca.
ESCENA 2 · 2-5s   CONTEXTO. El dato que crea tensión.
ESCENA 3 · 5-8s   GIRO. Lo que no sabías.
ESCENA 4 · 8-11s  DECISIÓN. La pregunta al espectador.
ESCENA 5 · 11-14s PRODUCTO. Captura REAL de LigaLab resolviéndolo.
ESCENA 6 · 14-15s CIERRE. Marca, discreta.
```

La marca no aparece **hasta la escena 5**. Antes es contenido; después es
producto.

---

## 5. Coste mensual estimado

| Concepto | Cálculo | Mes |
| --- | --- | --- |
| Seedance | 3 piezas/día × 30 × ~0,05-0,15 $ | **5-14 $** |
| Imágenes | Incluido en herramientas ya contratadas | 0 $ |
| Publicación | APIs gratuitas | 0 $ |
| **Total** | | **< 15 $/mes** |

El presupuesto no es el límite. **El límite es tu tiempo de revisión**, y por eso
el ritmo del §5 de `CONTENT_ENGINE.md` empieza en 1-2 piezas al día.
