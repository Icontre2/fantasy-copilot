# Modelo de datos

Implementado en Supabase (proyecto `ggqealkrogfgbykicmfo`).

## Núcleo

- `profiles`: perfil ligado a `auth.users`
- `clubs`: catálogo de clubes
- `players`: catálogo canónico de jugadores
- `fantasy_teams`: equipos fantasy de cada usuario
- `squad_players`: jugadores de cada plantilla
- `market_entries`: mercado introducido por el usuario
- `player_metrics`: métricas históricas
- `recommendations`: recomendaciones generadas

## Onboarding e importación

- `onboarding_progress`
- `import_batches`
- `import_items`

## Ingesta desacoplada

- `data_providers`
- `sync_runs`
- `fixtures`
- `player_availability`
- `player_fixture_stats`

## Seguridad verificada

Todas las tablas tienen RLS activado. Los datos privados están aislados por propietario; los catálogos compartidos son de solo lectura para usuarios autenticados. `sync_runs` no tiene políticas de frontend por diseño. La ejecución directa pública de `handle_new_user()` fue revocada; el trigger de registro continúa funcionando.

No introducir migraciones nuevas desde Lovable sin revisar antes el esquema real.
