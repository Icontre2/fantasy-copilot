# Acceso con cuentas sociales de LALIGA Fantasy

## Estado

LALIGA Fantasy permite crear/iniciar sesión con Google, Apple y Facebook dentro de su propio flujo Azure AD B2C. La app web de LigaLab no puede recibir directamente ese callback porque LALIGA tiene registrado el esquema nativo `authredirect://com.lfp.laligafantasy`, perteneciente a su aplicación móvil.

Por eso hay dos caminos separados:

1. **Email + contraseña de LALIGA**: sigue usando el flujo Resource Owner Password Credentials existente.
2. **Cuenta de LALIGA creada con Google, Apple o Facebook**: el usuario inicia sesión en la web oficial de LALIGA y pega la respuesta JSON de token en LigaLab. `/api/fantasy/auth/token` valida el `access_token` contra el perfil privado de LALIGA antes de crear la sesión local.

## Seguridad

- No se acepta un JWT únicamente por tener formato de JWT: se valida contra la API privada de LALIGA.
- El token importado no se escribe en logs ni en `localStorage`.
- Después de validarlo, se usa la misma infraestructura de sesión del resto de LigaLab y el navegador recibe una cookie `HttpOnly`.
- Si la respuesta incluye `refresh_token`, se conserva dentro del almacén de sesión cifrado para el modo persistente.

## Por qué no hay OAuth social de LALIGA en un clic en una web

El endpoint de autorización de LALIGA rechaza redirects web que no estén registrados. El redirect conocido para el cliente móvil es `authredirect://com.lfp.laligafantasy`; en navegador ese esquema abre/retorna a la app nativa de LALIGA, no a LigaLab. Hacerlo en un clic requeriría que LALIGA registrase un redirect HTTPS de LigaLab o una aplicación nativa propia capaz de recibir el callback y devolver la sesión de forma segura.
