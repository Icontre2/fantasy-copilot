# Modelo de datos

Implementado en Supabase, proyecto `ggqealkrogfgbykicmfo`.

## Núcleo

- `profiles`: perfil ligado a `auth.users`.
- `clubs`: catálogo de clubes.
- `players`: catálogo canónico de jugadores.
- `fantasy_teams`: equipos fantasy de cada usuario.
- `squad_players`: jugadores de cada plantilla.
- `market_entries`: mercado introducido por el usuario.
- `player_metrics`: métricas históricas.
- `recommendations`: recomendaciones generadas.

## Onboarding e importación

- `onboarding_progress`.
- `import_batches`.
- `import_items`.

## Ingesta desacoplada

- `data_providers`.
- `sync_runs`.
- `fixtures`.
- `player_availability`.
- `player_fixture_stats`.

## Plantillas sin catálogo

La migración `support_manual_squad_import` permite que una fila de `squad_players` represente:

- un jugador canónico mediante `player_id`; o
- un jugador importado mediante `imported_name`, `imported_position` e `imported_club`.

Cambios:

- `player_id` es nullable;
- `imported_position` admite `GK`, `DEF`, `MID`, `FWD` o null;
- `imported_club` es texto opcional;
- cada fila exige `player_id` o un `imported_name` no vacío.

Esto hace que manual/CSV funcione incluso cuando `players` está vacío. Si un nombre coincide exactamente con el catálogo, la importación enlaza el UUID canónico; si no, conserva los campos importados.

## Seguridad verificada

Todas las tablas tienen RLS activado. Los datos privados están aislados por propietario; los catálogos compartidos son de solo lectura para usuarios autenticados. `sync_runs` no tiene políticas de frontend por diseño. La ejecución directa pública de `handle_new_user()` fue revocada; el trigger de registro continúa funcionando.

Los cambios DDL deben aplicarse mediante migraciones revisables. Lovable no debe modificar el esquema.
