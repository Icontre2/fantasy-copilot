# LigaLab en iPhone — login social de LALIGA

## Objetivo

Permitir que una cuenta de LALIGA Fantasy creada con Google, Apple o Facebook entre desde el iPhone sin copiar tokens ni utilizar un ordenador.

## Flujo

1. La WebView de LigaLab llama `POST /api/fantasy/auth/mobile/start`.
2. El servidor genera `state`, `code_verifier` y `code_challenge` (PKCE). El verifier queda en una cookie Secure + HttpOnly de cinco minutos.
3. El plugin `LaligaOAuth` abre la URL oficial de LALIGA mediante `ASWebAuthenticationSession`.
4. El usuario elige Google, Apple o Facebook y completa el acceso en el dominio de LALIGA.
5. La sesión nativa captura `authredirect://com.lfp.laligafantasy?...` y devuelve a la WebView únicamente `callbackUrl` (`code` + `state`).
6. La WebView llama `POST /api/fantasy/auth/mobile/complete`.
7. El servidor comprueba esquema/host y `state`, recupera el verifier de la cookie HttpOnly e intercambia el `code` por tokens mediante PKCE.
8. Antes de crear sesión, el servidor valida el token consultando el perfil privado de LALIGA.
9. LigaLab crea su cookie HttpOnly normal y recarga la aplicación.

## Seguridad

- La contraseña social nunca pasa por LigaLab.
- El `code_verifier` nunca sale al JavaScript ni al plugin iOS.
- Los tokens de LALIGA no se guardan en `localStorage`.
- El plugin solo acepta una URL inicial HTTPS cuyo host sea `login.laliga.es`.
- El backend solo acepta callbacks con esquema `authredirect` y host `com.lfp.laligafantasy`.
- El `state` evita que un callback de otro intento pueda completar la sesión.
- La sesión solo se crea si el token abre `/api/v3/user` de LALIGA.

## Archivos

- `app/api/fantasy/auth/mobile/start/route.ts`: inicio PKCE.
- `app/api/fantasy/auth/mobile/complete/route.ts`: intercambio y sesión.
- `src/server/laliga/auth.ts`: intercambio `authorization_code`.
- `mobile/ios/LaligaOAuthPlugin.swift`: `ASWebAuthenticationSession`.
- `app/fantasy/mobile-auth.ts`: puente WebView ↔ plugin.
- `app/fantasy/NativeMobileLogin.tsx`: entrada exclusiva de la app iPhone.
- `capacitor.config.json`: contenedor LigaLab apuntando a producción.
- `.github/workflows/ios-verify.yml`: compilación de comprobación en macOS/iPhone Simulator.

## Publicación

No mezclar esta rama en `main` hasta que `iOS verify` compile correctamente. Después, generar el proyecto iOS con Capacitor, añadir el plugin al target, firmar con una cuenta de Apple Developer y distribuir por TestFlight o dispositivo de desarrollo.
