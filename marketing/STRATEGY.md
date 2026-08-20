# Estrategia — LigaLab

---

## 1. Lo que hay que decidir antes de gastar un euro

### 1.1 El permiso de LALIGA

`docs/AUDITORIA_FASE_1.md` §0 dice que las condiciones de LALIGA limitan el uso al
ámbito **personal/privado** y exigen **consentimiento escrito para uso
comercial**. Este plan entero es uso comercial.

**Consecuencia práctica:** si LALIGA corta el acceso a su API privada, LigaLab
deja de funcionar por completo — no se degrada, se apaga. Y con ella, la fábrica
de contenido, porque los insights salen de esos datos.

**Decisión requerida (no técnica, es tuya):**

| Opción | Qué implica |
| --- | --- |
| **A. Pedir permiso por escrito** | Escribir a LALIGA describiendo el uso. Lento e incierto, pero es la única vía que hace el plan sostenible |
| **B. Crecer sin permiso** | Es lo que hacen otros. Riesgo binario: funciona hasta que deja de funcionar, probablemente justo cuando el crecimiento te haga visible |
| **C. Mantenerlo privado** | Sin tiendas ni campañas. Herramienta para ti y tu círculo. Riesgo casi nulo |

**Recomendación:** empezar por **A** el lunes —cuesta un correo— y mientras tanto
ejecutar solo la parte de la estrategia que no es de pago ni de tienda
(contenido orgánico, comunidad). No lanzar en App Store hasta tener respuesta:
una tienda es el sitio donde LALIGA te encuentra sin buscarte.

### 1.2 Las tres fugas que hay que tapar antes de captar

Crear demanda hacia un producto con estas fugas es tirar el dinero:

| # | Fuga | Por qué es bloqueante |
| --- | --- | --- |
| 1 | **Cuentas de LALIGA creadas con Google/Apple/FB no pueden entrar** | Rebotan en el login. Es la issue #26 |
| 2 | **No hay analítica** | No sabrás qué contenido funciona. El punto 16 del brief no se puede ejecutar sin esto |
| 3 | **Sin política de privacidad ni términos** | Ya hay usuarios reales. Es exposición legal presente, no futura |

**Ninguna es de marketing y las tres son de marketing**, porque sin ellas todo lo
demás no se puede medir ni convertir.

---

## 2. Usuario

**No es «aficionado al fútbol».** Es:

> Persona que juega LALIGA Fantasy **en una liga privada con amigos o compañeros
> de trabajo**, donde el pique es personal, revisa la app varias veces al día y
> ya usa dos o tres herramientas externas.

Señales que lo identifican:
- Sabe qué es una cláusula y ha pagado alguna.
- Ha sentido que le clausulaban por sorpresa.
- Tiene o ha tenido una hoja de cálculo.
- Sigue cuentas de Fantasy en redes.

**Quien NO es:** el que juega solo por jugar, el fan de estadísticas sin liga, y
—hoy— cualquiera que no tenga ya cuenta de LALIGA Fantasy, porque no hay modo
demo.

---

## 3. Posicionamiento

### 3.1 Lo que NO podemos decir

No somos «lo que nadie hace»: FantasyStats ya anuncia análisis de cláusulas de
rivales, y varios ofrecen comparador, mercado y onces. Decir «el primero» sería
falso y comprobable en dos minutos.

### 3.2 La frase

> **Sabes cuánto dinero tiene realmente tu rival.**
> Y nada de lo que te enseñamos está inventado.

Dos patas, y las dos aguantan:

**Pata 1 — la caja del rival.** LALIGA no la publica. LigaLab la reconstruye con
100 M€ iniciales + historial completo + ingresos por puntos. No se ha encontrado
competidor que lo anuncie. Es *la* función que contesta «¿puede permitirse
quitarme a este?».

**Pata 2 — no inventamos.** Ni nota de fichaje, ni puja recomendada, ni puntos
esperados. Cuando no sabemos, ponemos `—`, no `0`. Cuando estimamos, ponemos `≈`
y explicamos el método.

### 3.3 La contrapartida, asumida

La pata 2 **también es una carencia**. Los competidores dan recomendaciones y
predicciones; mucha gente quiere exactamente eso. Vendemos negárselo.

Eso solo funciona con un mensaje concreto: **«te enseñamos la cuenta, no el
resultado»**. Y se defiende explicando *nuestro* método, nunca atacando el ajeno
— entre otras cosas porque uno de esos «competidores» (FútbolFantasy) es nuestro
proveedor de onces probables.

### 3.4 Territorio

No competimos en «estadísticas». Competimos en **decisiones**:

| Ellos | Nosotros |
| --- | --- |
| «Los datos de tu Fantasy» | «¿Qué hago ahora?» |
| Predicción | Evidencia |
| Recomendación | Cuenta transparente |
| Tu equipo | **Tu liga y tus rivales** |

---

## 4. Tono

**Sí:** premium, futbolero, directo, con datos delante. Frases cortas. Cifras
reales. El titular puede ser agresivo si el cuerpo lo sostiene.

**No:** corporativo, «revolucionario», «IA que predice», tipster, clickbait que
el contenido no cumple, emoji como muleta.

**La prueba del algodón:** si un titular no se puede respaldar con una captura de
la app o una cifra oficial, no se publica.

---

## 5. Cómo se consiguen los usuarios

### Primeros 100 — mano a mano, sin escalar
Ligas privadas propias, amigos, compañeros. Es lo que ya está pasando. Objetivo
real de esta fase: **detectar dónde se rompe** (E1, E2), no crecer.

### Primeros 1.000 — orgánico y comunidad
TikTok/Reels con la máquina de contenido (`CONTENT_ENGINE.md`), presencia útil en
comunidades de Fantasy (respondiendo, no spameando), y micro-creadores (<10k).
Requisito: tapar las tres fugas y tener rankings globales para alimentar contenido.

### Primeros 10.000 — tienda + creadores + bucle viral
App Store y Google Play (solo con la decisión 1.1 resuelta), creadores de 10-50k,
y tarjetas compartibles desde el producto. Este tramo **no es alcanzable con el
producto de hoy**: necesita el bucle viral, que no existe.

---

## 6. Qué construir en el producto para crecer

Ordenado por retorno sobre esfuerzo. Escala 1-5.

| # | Qué | Por qué | Impacto | Esfuerzo | Coste | Auto. |
|---|---|---|---|---|---|---|
| 1 | **Arreglar el login social (#26)** | Deja de rebotar tráfico | 5 | 2 | 1 | 0% |
| 2 | **Analítica de producto** | Sin esto no se optimiza nada | 5 | 2 | 1 | 80% |
| 3 | **Encender push + cron** | Es la función que hace volver a diario | 5 | 2 | 1 | 100% |
| 4 | **Tarjetas compartibles** | Único bucle viral posible | 5 | 3 | 1 | 60% |
| 5 | **Rankings globales** | Motor del contenido diario | 5 | 3 | 1 | 90% |
| 6 | **Política de privacidad + términos** | Obligación legal ya vencida | 4 | 2 | 1 | 0% |
| 7 | **Sesión de 30 días** | Retención | 4 | 1 | 1 | 100% |
| 8 | **Modo demo con liga de ejemplo** | Convierte al curioso | 4 | 3 | 1 | 0% |
| 9 | **Simulador de subida de cláusula** | Dolor A4, sin cubrir | 3 | 2 | 1 | 0% |
| 10 | **Lesiones y sanciones** | Laguna vs. competencia | 3 | 4 | 2 | 0% |

**Los cinco primeros son el trabajo real de los próximos 30 días.** Nada de
marketing rinde sin ellos.

---

## 7. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
| --- | --- | --- | --- |
| LALIGA corta el acceso | Media | **Total** | Pedir permiso; no presumir de saltarse nada; sin marca «oficial» |
| FútbolFantasy cambia o bloquea | Media | Alto | Degradar con elegancia (ya lo hace: sin porcentaje sale `?`); no atacarles |
| Sin permiso, tienda rechaza por marca de terceros | Media | Alto | Descargo visible, sin escudos ni logos de LALIGA |
| Crecer sin analítica | **Alta** | Alto | Punto 2 antes de captar |
| Quemar creadores con producto que rebota en el login | Alta | Medio | E1 antes de contactar a nadie |
| Ser custodio de tokens de terceros sin aviso legal | Alta | Alto | Privacidad + consentimiento antes de activar Supabase |
