# Contenedor Android — login social de LALIGA

El proyecto nativo **no se comitea**: lo genera Capacitor (`npx cap add android`).
Aquí vive solo el plugin, igual que en `mobile/ios/`. Este documento dice cómo
se enchufa; `.github/workflows/android-verify.yml` hace exactamente estos pasos
en cada PR, así que si algo de aquí se queda desfasado, la CI se pone roja.

## Por qué hace falta una app y no basta la web

LALIGA solo acepta como redirect el esquema nativo
`authredirect://com.lfp.laligafantasy`, que es el de **su propia app**. Un
navegador no puede recibir ese callback. Por eso quien creó su cuenta de LALIGA
con Google, Apple o Facebook no puede entrar desde la web sin pegar un token a
mano — y dentro de una app que declare ese esquema, sí.

Es el mismo motivo que en iPhone. Ver `docs/IPHONE_SOCIAL_LOGIN.md`.

## Los cuatro pasos

**1. Copiar el plugin** a `android/app/src/main/java/com/inigo/ligalab/`.

**2. Registrarlo** en `MainActivity`, antes de `super.onCreate`:

```java
registerPlugin(LaligaOAuthPlugin.class);
```

**3. El manifiesto**, en la actividad principal. Las dos cosas son obligatorias:

```xml
android:launchMode="singleTask"
```

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="authredirect" android:host="com.lfp.laligafantasy" />
</intent-filter>
```

> **`singleTask` no es opcional.** Con el modo por defecto, el callback abriría
> una instancia NUEVA de la actividad y `handleOnNewIntent` no se llamaría
> nunca: el usuario se quedaría mirando un botón en «Entrando…» para siempre.

**4. La dependencia** de Custom Tabs en `android/app/build.gradle`:

```groovy
implementation "androidx.browser:browser:1.8.0"
```

## Lo que este plugin NO hace

No ve la contraseña, ni el `code_verifier` de PKCE, ni los tokens. Abre una
pantalla y devuelve al JavaScript una única URL de callback con `code` y
`state`. El intercambio lo hace el backend con el verifier que guardó en una
cookie `HttpOnly`. Si este plugin se filtrara entero, no habría nada dentro.

## Un aviso que no es técnico

El flujo usa el `client_id` y el esquema de redirect **de la app de LALIGA**.
Funciona, pero ese cliente móvil no es nuestro, y `marketing/PRODUCT_TRUTH.md`
§0 recuerda que no hay autorización comercial de LALIGA. Es exactamente la clase
de cosa que puede acabar con el acceso cortado. Publicar esto es una decisión de
negocio, no un detalle de ingeniería.

## Publicación

No basta con que la CI compile. Hace falta cuenta de Google Play, firmar el
paquete y pasar la revisión de la tienda.
