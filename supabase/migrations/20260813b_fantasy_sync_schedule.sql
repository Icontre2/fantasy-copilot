-- Fantasy: suscripciones de sincronizacion automatica.
--
-- Motivacion: el ledger economico solo puede detectar operaciones comparando dos
-- fotos consecutivas, y la ATRIBUCION del importe solo funciona cuando el manager
-- hizo UNA operacion en el intervalo (ver `economy/transactions.ts`). Sincronizar
-- a mano deja huecos largos, y en un hueco largo caben varias operaciones: el
-- dinero total sigue cuadrando, pero deja de saberse a que jugador corresponde.
-- Por eso el sync periodico no es una comodidad, es lo que hace util al ledger.
--
-- Como la tarea programada no tiene cookie de navegador, necesita saber QUE ligas
-- sincronizar y CON QUE sesion. Esta tabla es ese registro.
--
-- RLS activado y CERO politicas, igual que el resto: solo la escribe el servidor
-- con `service_role`. Deny-by-default para `anon` y `authenticated`.

create table if not exists public.fantasy_sync_subscriptions (
  id uuid primary key default gen_random_uuid(),
  league_id text not null,
  -- Sesion con la que se leera la liga. Si caduca, la suscripcion se para y se
  -- marca: seguir en silencio dejaria huecos invisibles en el ledger.
  session_id text not null,
  league_name text,
  enabled boolean not null default true,

  -- Resultado de la ultima ejecucion. Es lo que permite que la UI diga "esto
  -- lleva parado desde X" en vez de aparentar que el historico esta completo.
  last_run_at timestamptz,
  last_status text,
  last_error text,
  last_detected_transactions integer,
  consecutive_failures integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Una suscripcion por liga. Reactivar desde otra sesion actualiza la fila en
  -- vez de crear una segunda que sincronizaria en paralelo la misma liga.
  unique (league_id)
);

create index if not exists fantasy_sync_subscriptions_due_idx
  on public.fantasy_sync_subscriptions (enabled, last_run_at);

alter table public.fantasy_sync_subscriptions enable row level security;
