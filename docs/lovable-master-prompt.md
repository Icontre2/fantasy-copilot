# Prompt maestro para Lovable

Trabaja sobre **Fantasy Copilot** sin crear una segunda aplicación. GitHub es la fuente canónica; Lovable se usa para revisión visual móvil.

## Fuente de verdad

- Repositorio: `Icontre2/fantasy-copilot`.
- Cambio activo: PR #7, rama `agent/laliga-private-readonly`.
- Después de fusionar, usa `main`.
- Lee `README.md`, `docs/architecture.md` y `docs/laliga-readonly-integration.md`.
- Proyecto Supabase existente: `ggqealkrogfgbykicmfo`.
- Auth, RLS y la RPC atómica ya están configurados.
- No crees otra base, tablas, funciones, políticas o rutas de autenticación.
- Usa únicamente la clave publicable en cliente; nunca `service_role`.

## Decisión obligatoria sobre LALIGA Fantasy

Existe un **piloto privado, de una cuenta y solo lectura**, autorizado por el dueño para probar su propia cuenta. No es una integración oficial y no puede ofrecerse a terceros ni monetizarse.

Preserva exactamente:

- `app/laliga-connection.tsx`;
- `app/api/laliga/*`;
- `app/laliga-session.ts`;
- `app/laliga-contract.ts`;
- `public.replace_laliga_snapshot`;
- el feature flag desactivado por defecto;
- manual y CSV como respaldo.

No hagas ninguna de estas acciones:

- mover el login de LALIGA al frontend;
- guardar email, contraseña, token o sesión en Supabase, localStorage o analítica;
- registrar cuerpos de login o errores upstream;
- crear un proxy genérico;
- añadir endpoints POST, PUT, PATCH o DELETE hacia LALIGA;
- reutilizar código del repositorio de referencia sin licencia;
- comprar, vender, pujar o cambiar alineaciones;
- añadir refresh token o sincronización con la app cerrada;
- afirmar que la conexión es oficial, pública o estable.

## Prioridad del siguiente bloque

Revisar visualmente el flujo ya construido, sin reimplementar la seguridad:

1. Botón `Conectar cuenta privada` visible en onboarding y Perfil.
2. Modal cómodo en iPhone con teclado abierto.
3. Divulgación clara antes de enviar credenciales.
4. Estado de carga durante login y consulta de ligas.
5. Selector de liga táctil.
6. Resultado de sincronización con jugadores, mercado y saldo.
7. Desconexión inmediata fácil de encontrar.
8. Mensaje para cuentas Google, Apple o Facebook.
9. CSV y manual dentro de opciones de respaldo.
10. Textos correctos en singular y plural.
11. Persistencia visual tras recargar.
12. Accesibilidad, lint, tests y build.

## Diseño

- Estética deportiva premium y tecnológica.
- Fondo claro, tarjetas limpias, tipografía contundente y jerarquía fuerte.
- Prioridad absoluta a iPhone.
- Navegación inferior: Inicio, Plantilla, Mercado y Perfil.
- No copies logos, identidad ni interfaz oficial de LALIGA Fantasy.
- No añadas trackers o scripts de terceros al formulario.

## MVP que debe preservarse

- Registro, acceso, cierre y recuperación de Fantasy Copilot.
- Onboarding y creación automática o manual del equipo.
- Dashboard, plantilla, mercado y perfil.
- Modo demo.
- Persistencia Supabase aislada por usuario.
- Conexión privada bajo demanda.
- Carga manual y CSV permanentes.
- Estados de carga, error, caducidad y vacío.

## Calidad

- TypeScript estricto y dependencias fijadas.
- Componentes accesibles y reutilizables.
- No generes datos falsos permanentes.
- Ejecuta `npm run lint`, `npm test` y `npm run build`.
- No des por válido el resultado hasta probarlo en ancho de iPhone.
- Resume archivos modificados, pruebas y cualquier bloqueo real.

## Resultado esperado

Una mejora visual del flujo canónico en la que el dueño conecta su cuenta, elige liga, sincroniza y desconecta con seguridad, manteniendo manual y CSV como recuperación. No se cambia la arquitectura ni se amplía el permiso de solo lectura.
