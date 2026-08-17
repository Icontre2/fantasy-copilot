-- Alertas que avisan solas: suscripciones push y el estado que evita el spam.
--
-- Igual que `fantasy_sessions` y `fantasy_links`: RLS activado y CERO
-- politicas. Sin politica, RLS deniega a `anon` y a `authenticated`;
-- `service_role` la salta por definicion y es el unico que las toca. Deny by
-- default, no un descuido.

-- ---------------------------------------------------------------------------
-- A que suscripcion push mandar el aviso, para que sesion y que liga.
--
-- Una sesion puede seguir varias ligas (una fila por liga), y puede tener
-- varios dispositivos suscritos (varias filas, mismo session_id+league_id,
-- distinto endpoint) — el movil y el portatil, por ejemplo.
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.fantasy_sessions(id) on delete cascade,
  league_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (session_id, league_id, endpoint)
);

create index if not exists push_subscriptions_session_idx
  on public.push_subscriptions (session_id);

alter table public.push_subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- El ultimo nivel por el que YA se avisó de cada jugador, por sesion y liga.
--
-- Sin esto, cada pasada del cron repetiria el mismo aviso para un jugador que
-- sigue igual de cerca de su clausula: no es avisar, es spam. Ver
-- `src/server/alerts/notify-diff.ts`, que es donde vive la decision de cuando
-- avisar y que usa esta tabla como memoria.
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_alert_state (
  session_id text not null references public.fantasy_sessions(id) on delete cascade,
  league_id text not null,
  player_id text not null,
  level text not null,
  notified_at timestamptz not null default now(),
  primary key (session_id, league_id, player_id)
);

alter table public.fantasy_alert_state enable row level security;
