# Registro de cambios de base de datos

## 2026-07-26 — `support_manual_squad_import`

### Motivo

`squad_players.player_id` era obligatorio, aunque el modelo ya contenía `imported_name`. Eso impedía que manual/CSV funcionase antes de cargar el catálogo canónico.

### Cambio aplicado

```sql
alter table public.squad_players
  alter column player_id drop not null;

alter table public.squad_players
  add column if not exists imported_position text,
  add column if not exists imported_club text;

alter table public.squad_players
  add constraint squad_players_imported_position_check
  check (
    imported_position is null
    or imported_position in ('GK', 'DEF', 'MID', 'FWD')
  );

alter table public.squad_players
  add constraint squad_players_player_or_imported_name_check
  check (
    player_id is not null
    or nullif(btrim(imported_name), '') is not null
  );
```

La migración registrada es idempotente: solo crea las restricciones si no existen.

### Verificación

- Columnas y restricciones comprobadas en producción.
- RLS no cambió.
- El asesor de seguridad mantiene únicamente el aviso informativo intencionado de `sync_runs` sin políticas de frontend.
- Tipos TypeScript actualizados en `app/database.types.ts`.

## 2026-07-27 — `replace_laliga_snapshot`

### Motivo

La conexión privada necesita reemplazar equipo, plantilla y mercado como una sola unidad. Varias operaciones REST independientes podrían dejar datos parciales si una petición falla.

### Cambio aplicado

Se añadió `public.replace_laliga_snapshot` para:

- derivar el propietario desde `auth.uid()`;
- crear el primer equipo o actualizar uno perteneciente al usuario;
- validar IDs, posiciones, importes, duplicados y límites;
- reemplazar plantilla y mercado dentro de una transacción;
- completar el onboarding;
- devolver identificador y recuentos.

La función usa `SECURITY INVOKER`, `search_path` vacío, ejecución solo para `authenticated` y las políticas RLS existentes. No usa `service_role`.

Archivo: `supabase/migrations/20260727054500_replace_laliga_snapshot.sql`.

### Verificación

- SQL compilado primero dentro de una transacción revertida.
- Migración registrada correctamente.
- Llamada sin identidad rechazada.
- `prosecdef = false` confirmado.
- `PUBLIC` y `anon` no tienen permiso de ejecución.
- Tipos TypeScript regenerados desde el proyecto.
- Asesor de seguridad ejecutado después del cambio.

