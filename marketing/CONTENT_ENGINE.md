# Content Engine — de un dato a seis piezas

> **Principio.** No se producen 5 piezas al día. Se produce **1 insight al día**
> y se despliega en 5-6 formatos. Es la única forma de que una persona sostenga
> el ritmo.

---

## 0. El requisito que hoy no se cumple

El motor se alimenta de **insights de datos reales**: «este jugador ha subido
400k/día», «este está frenando», «este está a 1,2 M de su cláusula».

**Hoy no se pueden generar automáticamente.** Faltan dos cosas:

1. **Rankings globales.** LigaLab calcula todo por liga, no sobre el catálogo
   entero. Los datos existen (`/api/fantasy/players` + `/players/[id]/history`),
   pero no hay agregación.
2. **Una sesión que no caduque.** Un proceso automático necesita sesión con
   LALIGA, y hoy dura ~24 h (`SOLO_COOKIE`). Requiere la configuración de
   Supabase de la issue #26.

**Hasta entonces el motor funciona en modo manual:** el insight se saca mirando
la app y se teclea en un JSON. Es más lento pero produce el mismo contenido.
No esperes a la automatización para empezar a publicar.

---

## 1. El ciclo

```
DATO  ─────────────► un movimiento notable en el mercado o en una cláusula
  │
INSIGHT  ──────────► ¿por qué le importa a alguien? → un pain point de PAIN_POINTS.md
  │
HOOK  ─────────────► la primera frase. Se escriben 3 y se elige 1
  │
GUION  ────────────► 5-7 frames. Estructura PROBLEMA → TENSIÓN → DECISIÓN → LIGALAB
  │
ASSETS  ───────────► captura real del producto + imagen generada + vídeo Seedance
  │
REVISIÓN HUMANA  ──► ⚠️ obligatoria. Ver §4
  │
PUBLICACIÓN  ──────► TikTok, Reels, Shorts, carrusel, X, Stories
  │
MÉTRICA  ──────────► se anota en el JSON de la pieza
  │
APRENDIZAJE  ──────► qué hook, qué tema, qué duración
```

## 2. Un insight → seis piezas

Ejemplo con un dato: *«X ha subido 1,9 M€ en 7 días y hoy frena.»*

| Formato | Ángulo | Duración | Reutiliza |
| --- | --- | --- | --- |
| **TikTok** | «Lo compraste a 18. Va por 19,9. Hoy frena. ¿Vendes?» | 9-15 s | Guion base |
| **Reel** | Igual, pero con música de tendencia distinta y texto reposicionado | 9-15 s | Mismo render, otro corte |
| **Short** | Igual con cierre explícito hablado | 15-20 s | Mismo render, otro cierre |
| **Carrusel IG** | 5 slides: valor → subida → freno → decisión → gráfica | — | Mismos datos, formato estático |
| **X / Threads** | Captura de la gráfica + una frase seca | — | Captura del carrusel |
| **Story** | Encuesta: «¿vendes o aguantas?» | — | Slide 4 del carrusel |

**Nunca es un repost:** el ángulo, el ritmo y el cierre cambian. Lo que se
reutiliza es el *dato* y los *assets*, no la pieza.

## 3. Estructuras narrativas — rotar para no cansar

Usar una distinta cada día. Todas acaban en LigaLab, pero por caminos distintos.

| # | Estructura | Ejemplo de apertura |
| --- | --- | --- |
| E1 | **Problema → tensión → decisión** | «Compraste a X por 18M.» |
| E2 | **Dilema A vs B** | «Solo puedes fichar a uno.» |
| E3 | **Creencia falsa → dato** | «Crees que tu rival no tiene dinero.» |
| E4 | **Error caro** | «El error que te está costando millones.» |
| E5 | **Dato oculto** | «Nadie está mirando esto.» |
| E6 | **POV** | «POV: vendes y mañana sube 2M.» |
| E7 | **Antes / después** | «Así lo hacía yo. Así lo hago ahora.» |
| E8 | **Cuenta atrás** | «Le quedan 3 días para ponerse a tiro.» |
| E9 | **Confesión** | «Mi peor venta de la temporada.» |
| E10 | **Pregunta directa** | «¿Tú sabrías cuánto dinero tiene tu rival?» |

## 4. Revisión humana — no negociable

Un bot publicando sobre dinero ajeno y jugadores reales se equivoca caro. Antes
de publicar, alguien confirma:

- [ ] **La cifra es real** y sigue siéndolo hoy (los valores cambian a diario).
- [ ] No se afirma nada del bloque «Lo que NO podemos decir» de `PRODUCT_TRUTH.md`.
- [ ] No se anuncia función apagada (push, cron, login social).
- [ ] No se sugiere vínculo con LALIGA. Escudos y logos, fuera.
- [ ] Si aparece un jugador real, se habla de su **valor de mercado**, nunca de su
      persona.
- [ ] Si aparece un manager, **no se identifica a nadie real** sin permiso.
- [ ] La captura no enseña datos de una persona identificable.

## 5. Ritmo realista

| Semana | Piezas/día | Nota |
| --- | --- | --- |
| 1-2 | 1-2 | Aprender el flujo. Todo manual |
| 3-4 | 2-3 | Plantillas hechas, Seedance en marcha |
| 5-8 | 3-5 | Con rankings globales listos |

**3-5 al día desde el primer día es una receta para abandonar en dos semanas.**
Mejor 1 diaria durante 60 días que 5 durante 6.

## 6. Estructura de carpetas

```
/content/
  ideas/           ideas sin desarrollar
  scripts/         guion por pieza
  storyboards/     frames
  seedance-prompts/  prompt por escena
  images/          generadas y capturas
  renders/         vídeo final por plataforma
  published/       lo publicado, con enlaces
  analytics/       métricas volcadas
```

**ID:** `LL-2026-001`, correlativo. Un JSON por pieza (esquema en
`content/ideas.json`).
