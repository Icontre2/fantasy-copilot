-- Fantasy: sesion, historico de operaciones e ingreso por puntos.
--
-- Todas estas tablas las escribe el proceso de sincronizacion del servidor con
-- la clave `service_role`, nunca el navegador. Por eso llevan RLS ACTIVADO y
-- CERO politicas: sin politica, RLS deniega a `anon` y a `authenticated`, y
-- `service_role` la salta por definicion. Es deny-by-default, no un descuido.

-- ---------------------------------------------------------------------------
-- Sesion de LALIGA: tokens cifrados en la aplicacion (AES-256-GCM).
-- La base nunca ve el token en claro, ni siquiera con acceso directo a la fila.
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_sessions (
  id text primary key,
  encrypted_tokens text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists fantasy_sessions_expires_at_idx
  on public.fantasy_sessions (expires_at);

alter table public.fantasy_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- NOTA (2026-08-14): aqui habia tres tablas mas —fotos de la liga, operaciones
-- detectadas e ingreso por puntos— para reconstruir la contabilidad comparando
-- capturas sucesivas.
--
-- Ya no hacen falta. LALIGA publica el libro de operaciones con importes exactos
-- en `GET /leagues/{id}/activity`, asi que la economia se LEE en vez de
-- deducirse de la variacion de caja entre fotos. Ver `economy/activity.ts`.
--
-- Se eliminan en vez de dejarlas vacias: una tabla sin escritor invita a
-- rellenarla. Si alguna vez se guardan capturas propias —para cubrir los dias
-- que LALIGA ya no publica— se creara el esquema que haga falta entonces.
-- ---------------------------------------------------------------------------
