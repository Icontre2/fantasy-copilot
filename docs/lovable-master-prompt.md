# Prompt maestro para Lovable

Construye el primer frontend funcional de **Fantasy Copilot**, una aplicación web móvil-first para ayudar a usuarios de LALIGA Fantasy a tomar decisiones sobre su plantilla.

## Contexto técnico

- Conecta con el proyecto Supabase existente `ggqealkrogfgbykicmfo`.
- Supabase Auth y RLS ya están configurados.
- Usa solo la clave pública/publishable de Supabase.
- No pidas ni almacenes credenciales de LALIGA Fantasy.
- No crees ni cambies tablas, migraciones o políticas RLS sin aprobación.
- Usa los nombres exactos del esquema existente.

## Diseño

- Estética deportiva premium y tecnológica.
- Fondo claro, tarjetas limpias, tipografía contundente y jerarquía visual fuerte.
- Prioridad absoluta a iPhone.
- Navegación inferior: Inicio, Plantilla, Mercado y Perfil.
- No copies logos, identidad ni interfaz oficial de LALIGA Fantasy.

## Autenticación

Incluye registro por email y contraseña, inicio y cierre de sesión, recuperación de contraseña, rutas privadas y lectura del perfil desde `profiles`. No implementes todavía proveedores sociales.

## Onboarding

Después del primer acceso, usa `onboarding_progress` para mostrar cuatro pasos:

1. Bienvenida: explicar que no se necesita la contraseña de LALIGA.
2. Datos del equipo: nombre, saldo y valor total opcional. Crear `fantasy_teams` con `source = manual`.
3. Plantilla: buscar jugadores en `players`, agruparlos por posición, indicar precio de compra y valor actual y guardar en `squad_players`. La opción CSV puede mostrarse como próxima función; no borres su infraestructura existente.
4. Confirmación: resumen por posición, saldo, número de jugadores y acceso al dashboard.

## Inicio

Muestra nombre del equipo, saldo, valor estimado, disponibilidad de jugadores, hasta tres recomendaciones recientes desde `recommendations` y el próximo partido relevante mediante `fixtures`. Si faltan datos, muestra estados vacíos elegantes y accionables.

## Plantilla

Lista por GK, DEF, MID y FWD con nombre, club, posición, estado, valor, titular y capitán. Permite añadir, editar y eliminar. Usa `fantasy_teams`, `squad_players`, `players`, `clubs` y `player_availability`.

## Mercado

Permite entrada manual de jugador, precio solicitado, valor de mercado, vendedor opcional y fecha de expiración opcional. Guarda en `market_entries` y ordena las tarjetas por precio.

## Perfil

Muestra nombre, email de sesión y estado del onboarding. Incluye reinicio de importación sin borrar la cuenta y cierre de sesión.

## Seguridad y calidad

- Respeta todas las políticas RLS.
- Vincula cada consulta privada al usuario autenticado.
- No uses `service_role` en el cliente ni crees políticas abiertas.
- No generes datos falsos permanentes.
- Usa TypeScript estricto, componentes reutilizables, formularios validados y estados de carga, error y vacío.

## Resultado esperado

Una aplicación navegable y conectada a Supabase en la que el usuario pueda registrarse, crear su equipo, introducir su plantilla, ver el dashboard y añadir jugadores manualmente al mercado.
