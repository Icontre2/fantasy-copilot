# App móvil de LigaLab (iPhone y Android)

## Para qué existe

Para una sola cosa que la web no puede hacer: **conectar una cuenta de LALIGA
Fantasy creada con Google, Apple o Facebook**. Esas cuentas no tienen
contraseña, y el login oficial de LALIGA solo devuelve al usuario a la dirección
de una app (`authredirect://com.lfp.laligafantasy`), nunca a una web. Una app
nativa sí puede recoger esa vuelta.

Todo lo demás es la misma web: la app carga
`https://fantasy-copilot-sigma.vercel.app` (ver `capacitor.config.json`), así que
cada despliegue de Vercel actualiza la app sin pasar por las tiendas.

## Cómo funciona el acceso

1. La app llama `POST /api/fantasy/auth/mobile/start`. El servidor genera
   `state` y PKCE; el verifier queda en una cookie HttpOnly de 5 minutos.
2. El plugin nativo `LaligaOAuth` abre el login oficial (`login.laliga.es`):
   - **iPhone:** `ASWebAuthenticationSession`, que recoge la vuelta sin que
     intervenga ninguna otra app.
   - **Android:** una Custom Tab (Google no deja iniciar sesión dentro de una
     WebView) y un `intent-filter` para `authredirect://com.lfp.laligafantasy`.
3. El usuario elige Google, Apple o Facebook en la pantalla de LALIGA.
4. Al JavaScript solo vuelve la URL de retorno (`code` + `state`), y se manda a
   `POST /api/fantasy/auth/mobile/complete`.
5. El servidor comprueba `state`, canjea el `code` con el verifier, valida el
   token contra el perfil privado de LALIGA y crea la sesión normal (30 días con
   renovación).

**Pega conocida en Android:** si el móvil tiene instalada la app oficial de
LALIGA Fantasy, las dos declaran el mismo esquema y Android pregunta con cuál
abrir la vuelta. Hay que elegir LigaLab. La propia app lo avisa en pantalla. En
iPhone no pasa.

## Archivos

| Pieza | Dónde |
| --- | --- |
| Plugin iOS | `ios/App/App/LaligaOAuthPlugin.swift` |
| Registro del plugin iOS | `ios/App/App/MainViewController.swift` (y `Main.storyboard` apunta a él) |
| Plugin Android | `android/app/src/main/java/com/inigo/ligalab/LaligaOAuthPlugin.java` |
| Registro del plugin Android | `MainActivity.java` + `intent-filter` en `AndroidManifest.xml` |
| Puente web ↔ plugin | `app/fantasy/mobile-auth.ts` |
| Botón (solo visible dentro de la app) | `app/fantasy/NativeMobileLogin.tsx` |
| Servidor | `app/api/fantasy/auth/mobile/{start,complete}/route.ts` |
| CI | `.github/workflows/ios-verify.yml`, `.github/workflows/android-verify.yml` |

Un plugin que vive dentro de la app **no se registra solo** en Capacitor: si
falta el registro, `window.Capacitor.Plugins.LaligaOAuth` no existe y el botón
no aparece nunca. Por eso están `MainViewController` y `MainActivity`.

## Probarla en Android (lo más rápido, gratis)

1. En GitHub, abre el pull request → pestaña **Checks** → **Android verify** →
   descarga el artefacto `ligalab-debug-apk`.
2. Pásalo al móvil e instálalo (Android pedirá permitir apps de origen
   desconocido).

O en local, con Android Studio instalado: `npm run mobile:sync` y
`npm run mobile:android`, y darle a ▶.

Para publicarla en Google Play hace falta una cuenta de desarrollador (pago
único de 25 $), firmar un `bundleRelease` con tu propia clave y subirlo desde
Play Console. La clave de firma **nunca** va al repositorio.

## Probarla en iPhone

Necesita un Mac con Xcode.

1. `npm ci && npm run mobile:sync && npm run mobile:ios`.
2. En Xcode: target **App → Signing & Capabilities → Team**, elige tu cuenta.
   Con una cuenta gratuita se puede instalar en tu propio iPhone (caduca a los
   7 días); para TestFlight o App Store hace falta el Apple Developer Program
   (99 $/año).
3. Conecta el iPhone y dale a ▶. Para TestFlight: **Product → Archive →
   Distribute App**.

El identificador de la app es `com.inigo.ligalab` (en `capacitor.config.json`).
Si se cambia, hay que cambiarlo también en el proyecto de Xcode y en
`android/app/build.gradle`.

**Aviso para la App Store:** si la app ofrece acceso con Google o Facebook,
Apple exige ofrecer también «Iniciar sesión con Apple». Ver
[`ENCENDER_APPLE_Y_FACEBOOK.md`](./ENCENDER_APPLE_Y_FACEBOOK.md).
