# Lanzamiento en App Store y Google Play

---

## 0. Antes de nada: dos bloqueos que pueden tumbar la ficha

### 0.1 Permiso de LALIGA

Ver `../STRATEGY.md` §1.1. **Una tienda es exactamente el sitio donde LALIGA te
encuentra sin buscarte.** Publicar sin permiso escrito es la forma más rápida de
convertir un riesgo teórico en una carta de sus abogados o una retirada de ficha.

**Recomendación: no enviar a revisión hasta tener respuesta.**

### 0.2 Guideline 4.2 de Apple — «Minimum Functionality»

Esto es técnico y es el riesgo de rechazo más probable.

`capacitor.config.json` está hoy configurado así:

```json
"server": { "url": "https://fantasy-copilot-sigma.vercel.app" }
```

Es decir: la app nativa **abre la web dentro de un WebView**. Apple rechaza con
frecuencia estas apps por «no ofrecer funcionalidad suficiente más allá de un
sitio web reempaquetado». Google es más permisivo, pero también lo contempla.

**Qué lo evita:**
- Empaquetar el front en el binario (`webDir` con el build real, no un `mobile-shell`
  que solo dice «Abriendo la aplicación…»).
- Añadir capacidades **nativas** reales: notificaciones push nativas, Face ID /
  Touch ID para entrar, widget de pantalla de inicio, compartir nativo.
- El plugin nativo de OAuth (`mobile/ios/LaligaOAuthPlugin.swift`) **ya cuenta**
  como funcionalidad nativa. Es un buen punto de partida.

---

## 1. Recomendación técnica

### Estado actual del repositorio

| Pieza | Estado |
| --- | --- |
| PWA instalable | ✅ Funciona: manifiesto, standalone, icono, pantalla sin conexión |
| Capacitor | ⚠️ Configurado, pero apuntando a la URL remota |
| Plugin nativo iOS OAuth | ✅ Existe (`LaligaOAuthPlugin.swift`, ASWebAuthenticationSession) |
| CI de iOS | ✅ Compila en simulador (`macos-15`, Capacitor 8.5.0) |
| Android | ❌ Nada |

### Comparativa

| Vía | Esfuerzo | Riesgo rechazo | Reutiliza | Push | Veredicto |
| --- | --- | --- | --- | --- | --- |
| **Solo PWA** | 0 | — | 100% | Web push (iOS 16.4+, solo si está instalada) | ✅ **Ahora** |
| **Capacitor con front empaquetado** | Medio | Medio | ~95% | Nativo, fiable | ✅ **Recomendada** |
| Capacitor apuntando a URL | Bajo | **Alto** (4.2) | 100% | Nativo | ❌ Como está hoy |
| React Native | Muy alto | Bajo | ~10% | Nativo | ❌ Rehacer la app entera |
| Nativa | Altísimo | Bajo | 0% | Nativo | ❌ Sin sentido para una persona |

> **Veredicto: Capacitor, empaquetando el front, no apuntando a la URL.**
> Ya hay plugin nativo y CI. El trabajo real es cambiar `webDir`, resolver que
> Next necesita servidor (o exportar estático las partes que se pueda), y añadir
> push nativo.

**Y antes de eso: exprime la PWA.** Se instala hoy, sin comisión del 30 %, sin
revisión y sin esperas. Si la PWA no retiene usuarios, la app nativa tampoco lo
hará — solo costará tres semanas descubrirlo.

---

## 2. Las doce fases

### FASE 1 · Preparación
- [ ] Resolver el permiso de LALIGA (§0.1)
- [ ] Arreglar login social (issue #26)
- [ ] Encender push y cron
- [ ] Instalar analítica
- [ ] **Publicar política de privacidad y términos** — obligatorio para ambas tiendas
- [ ] Decidir nombre definitivo y comprobar que no colisiona

### FASE 2 · Cuentas de desarrollador
- [ ] Apple Developer Program — **99 $/año**, verificación de identidad, puede tardar días
- [ ] Google Play Console — **25 $ pago único**
- [ ] ⚠️ Cuenta personal: Google exige **20 probadores durante 14 días** antes de
      poder publicar. Planifícalo con un mes de antelación
- [ ] Bundle ID: `com.inigo.ligalab` (ya en `capacitor.config.json`)

### FASE 3 · Build
- [ ] `webDir` al build real, quitar `server.url`
- [ ] Resolver el renderizado del servidor de Next (o servidor propio, o exportar)
- [ ] `npx cap add ios` / `npx cap add android`
- [ ] Iconos y splash para todos los tamaños
- [ ] Probar en dispositivo real, no solo simulador

### FASE 4 · Autenticación
- [ ] Integrar `LaligaOAuthPlugin.swift` en el flujo
- [ ] Equivalente Android (Custom Tabs)
- [ ] ⚠️ **Si ofreces login con Google o Facebook, Apple EXIGE «Sign in with Apple»**
      (guideline 4.8). No es opcional
- [ ] Deep links: Universal Links (iOS) + App Links (Android)

### FASE 5 · Privacidad
- [ ] **App Privacy Nutrition Label** de Apple: declarar que se recogen
      credenciales y datos de uso
- [ ] **Data Safety** de Google: lo mismo
- [ ] URL de política de privacidad, obligatoria
- [ ] Si hay analítica: declarar rastreo y, en iOS, plantear ATT
- [ ] Mecanismo de **borrado de cuenta** — Apple lo exige desde 2022 si hay registro

### FASE 6 · Capturas
Ver §4. iPhone 6,7" y 6,5"; Android teléfono y tablet 7"/10".

### FASE 7 · Metadatos
Ver `../ASO.md`.

### FASE 8 · Pruebas
- [ ] TestFlight: interno (hasta 100) y externo (hasta 10.000, con revisión)
- [ ] Google: prueba cerrada con los 20 probadores × 14 días
- [ ] Recorrer los estados vacíos: sin liga, sin sesión, sin conexión

### FASE 9 · Envío
- [ ] **Notas para el revisor con cuenta de prueba** — sin ella, rechazo casi seguro:
      no pueden entrar sin credenciales de LALIGA
- [ ] Explicar en las notas la relación con LALIGA y que es independiente
- [ ] Clasificación por edad
- [ ] Gratis, sin compras integradas en la v1

### FASE 10 · Lanzamiento
Ver `../90_DAY_PLAN.md`.

### FASE 11 · Reseñas
- [ ] `SKStoreReviewController` **tras un momento bueno** (una cláusula pagada con
      éxito), nunca al abrir
- [ ] Máximo 3 peticiones al año (límite de Apple)
- [ ] Responder todas las reseñas la primera semana

### FASE 12 · ASO continuo
Iterar keywords y capturas cada 2-4 semanas.

---

## 3. Checklist de rechazos probables

| Motivo | Prob. | Prevención |
| --- | --- | --- |
| 4.2 Minimum Functionality | **Alta** | Empaquetar el front + funciones nativas |
| Sin cuenta de prueba | **Alta** | Notas del revisor con credenciales |
| 4.8 Falta Sign in with Apple | Media | Añadirlo si hay Google/Facebook |
| Marca de terceros | Media | Descargo visible, sin escudos ni logos |
| Sin borrado de cuenta | Media | Implementarlo |
| Privacidad incompleta | Media | Rellenar con cuidado |
| Google: 20 probadores | **Alta** | Empezar 1 mes antes |

---

## 4. Capturas — guion

Cada texto corresponde a una función **que funciona hoy**.

| # | Titular | Qué se ve |
| --- | --- | --- |
| 1 | **Tu liga. Bajo control.** | Inicio con valor y competidores |
| 2 | **¿Quién puede pagarte una cláusula?** | Alerta con el hueco en rojo |
| 3 | **Cuánto dinero tiene tu rival.** | Ficha de competidor con caja `≈` |
| 4 | **Mira quién sube y quién frena.** | Evolución con selector de periodo |
| 5 | **Compara antes de fichar.** | Comparador |
| 6 | **Todo con datos oficiales. Nada inventado.** | Alerta con «sin tendencia porque…» |

La 6 es la más importante: es el posicionamiento, y ningún competidor puede
copiarla sin cambiar su producto.
