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
