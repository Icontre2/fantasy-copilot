# Puntos de dolor del jugador de LALIGA Fantasy

> **Honestidad metodológica.** Estos dolores salen de tres sitios: (a) mecánicas
> del juego verificadas en documentación oficial, (b) lo que la competencia
> anuncia resolver —que es una señal fuerte de demanda, porque nadie construye
> una función para un problema que nadie tiene—, y (c) el diseño del propio
> LigaLab, que nació de jugar.
>
> **No hay citas de usuarios reales.** No se han recogido y **no se inventan**.
> La columna «Evidencia» dice de dónde viene cada uno. Cerrar esa laguna es la
> tarea nº 1 de investigación (ver `COMPETITORS.md`, último apartado).

**Escalas:** Frecuencia e Intensidad de 1 a 5. Viral = potencial de contenido.
Conversión = probabilidad de que quien lo sufra se instale la app.

---

## Bloque A — Cláusulas (el núcleo)

| # | Problema | Frec. | Int. | Evidencia | Solución actual y por qué es mala | Función LigaLab | Viral | Conv. |
|---|---|---|---|---|---|---|---|---|
| A1 | «¿Me pueden quitar a mi jugador?» | 5 | 5 | Mecánica central + FantasyStats lo anuncia | Mirar cláusula a ojo en la app oficial, sin saber si el rival tiene caja | Alertas + caja de rivales | 5 | 5 |
| A2 | «¿A quién de mi liga puedo clausular ya?» | 5 | 4 | Mecánica + competencia | Revisar plantilla por plantilla a mano | Alertas ordenadas por cuándo puedes fichar | 5 | 5 |
| A3 | «¿Cuánto le falta a este para ponerse a tiro?» | 4 | 4 | Mecánica | Restar mentalmente cada día | Hueco + subida/día + días estimados | 5 | 4 |
| A4 | «¿Le subo la cláusula a mi jugador? ¿Cuánto?» | 4 | 4 | LALIGA permite subirla hasta 400% y cuesta dinero | Cálculo a ojo o calculadora de terceros | ❌ **No existe** — roadmap | 4 | 4 |
| A5 | «¿Cuándo se desbloquea el blindaje?» | 3 | 4 | Mecánica | La app oficial lo dice mal o no lo dice | Fecha y días exactos, o «LALIGA no lo publica» | 3 | 3 |
| A6 | «Me han clausulado y no me enteré» | 4 | 5 | Mecánica + competencia ofrece avisos | Mirar la app varias veces al día | ⚠️ Push **apagado** | 5 | 5 |

## Bloque B — Dinero de los rivales

| # | Problema | Frec. | Int. | Evidencia | Solución actual y por qué es mala | Función LigaLab | Viral | Conv. |
|---|---|---|---|---|---|---|---|---|
| B1 | «¿Cuánto dinero tiene realmente mi rival?» | 5 | 5 | LALIGA **no publica** la caja ajena | Suposiciones, o llevar la cuenta a mano en Excel | **Caja reconstruida** ← lo más diferencial | 5 | 5 |
| B2 | «¿Puede permitirse pagar la cláusula de mi jugador?» | 4 | 5 | Deriva de B1 + A1 | Rezar | Caja estimada vs. cláusula | 5 | 5 |
| B3 | «¿Quién está acumulando dinero para un pelotazo?» | 3 | 4 | Deriva de B1 | Imposible sin llevar la contabilidad | Economía por manager | 4 | 3 |
| B4 | «¿Cuánto se ha gastado este en fichajes?» | 3 | 3 | — | Scroll infinito por la actividad de la liga | Economía: compras, ventas, cláusulas | 3 | 3 |

## Bloque C — Comprar y vender

| # | Problema | Frec. | Int. | Evidencia | Solución actual y por qué es mala | Función LigaLab | Viral | Conv. |
|---|---|---|---|---|---|---|---|---|
| C1 | «¿Vendo ahora o espero a que suba más?» | 5 | 5 | Competencia entera gira alrededor de esto | Intuición | Evolución 1/3/7/30D + quién frena | 5 | 4 |
| C2 | «Vendí y al día siguiente subió 2M» | 4 | 5 | Dolor clásico del formato | Nada | Tendencia real, no corazonada | **5** | 4 |
| C3 | «¿Estoy pujando demasiado?» | 4 | 4 | Analítica Fantasy tiene «calculadora de puja óptima» | Calculadoras de terceros | Valor + cláusula + evolución. ❌ Sin calculadora propia | 4 | 3 |
| C4 | «¿Cuál de estos dos fichó?» | 5 | 4 | Todos tienen comparador | Abrir dos pestañas | Comparador | **5** | 4 |
| C5 | «¿Qué jugador de mi plantilla está perdiendo valor?» | 4 | 4 | — | Revisar uno a uno | Plantilla con delta por jugador y «movers» | 4 | 4 |
| C6 | «¿Compré demasiado caro?» | 3 | 4 | — | Comparar con el valor de hoy, a ojo | Evolución desde el 1 de agosto | 3 | 3 |

## Bloque D — Información dispersa

| # | Problema | Frec. | Int. | Evidencia | Solución actual y por qué es mala | Función LigaLab | Viral | Conv. |
|---|---|---|---|---|---|---|---|---|
| D1 | «Uso 3 apps y 2 webs para decidir una cosa» | 5 | 4 | Existen ≥5 herramientas para lo mismo | Saltar entre pestañas | Todo en una, para LALIGA Fantasy | 4 | 4 |
| D2 | «¿Quién juega y quién no?» | 5 | 4 | Es *el* dato de FútbolFantasy | Consultar otra web | Once probable propio y del rival | 4 | 4 |
| D3 | «¿Contra quién juega su equipo?» | 3 | 3 | — | Mirar el calendario aparte | Dificultad por cuotas reales | 3 | 2 |
| D4 | «¿Está lesionado?» | 5 | 5 | Competencia lo ofrece | Prensa, otra app | ❌ **No existe** — laguna grave | 4 | 4 |

## Bloque E — Fricciones del propio LigaLab

Dolores que **causamos nosotros**. Van aquí porque cada uno se come tráfico
pagado antes de que llegue a ver el producto.

| # | Problema | Int. | Impacto en captación |
|---|---|---|---|
| E1 | **Si tu cuenta de LALIGA es de Google/Apple/FB, no puedes entrar** | 5 | **Bloqueante.** Parte del tráfico rebota en el login. Arreglar antes de gastar un euro |
| E2 | La sesión dura 24 h: hay que meter la contraseña a diario | 4 | Mata la retención D7 y D30 |
| E3 | Pedir la contraseña de LALIGA da desconfianza | 4 | Fricción alta en frío. Necesita explicación visible |
| E4 | No hay modo demo: sin cuenta y sin liga, no hay nada que ver | 4 | Todo el tráfico curioso se pierde |
| E5 | No hay analítica: no sabemos dónde se cae la gente | 5 | Impide optimizar nada |

---

## Los diez con más retorno

Orden por `frecuencia × intensidad × conversión`, corregido por si LigaLab lo
resuelve **hoy**:

1. **B1** — cuánto dinero tiene tu rival → *lo único verdaderamente nuestro*
2. **A1/A2** — a quién puedes clausular y quién puede clausularte a ti
3. **C1/C2** — vender ahora o esperar
4. **C4** — a cuál de los dos fichas
5. **A3** — cuánto le falta a este
6. **B2** — puede permitírselo tu rival
7. **C5** — quién de los tuyos se está hundiendo
8. **D1** — todo en una
9. **A4** — subir cláusula *(roadmap, alto valor)*
10. **D4** — lesiones *(roadmap, laguna vs. competencia)*

**Y antes que todos ellos: E1.** No tiene sentido crear demanda para un login que
rechaza a parte de quien llega.
