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
-- Fotos del estado economico de la liga.
--
-- LALIGA no publica historico de operaciones: solo se puede saber que paso
-- comparando dos fotos consecutivas. Guardarlas es lo que permite que el
-- historico exista, y es tambien el motivo de que el ledger no pueda empezar
-- antes de la primera sincronizacion.
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_league_snapshots (
  id uuid primary key default gen_random_uuid(),
  league_id text not null,
  captured_at timestamptz not null,
  week_number integer,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  -- Dos sincronizaciones simultaneas no deben dejar dos fotos del mismo instante.
  unique (league_id, captured_at)
);

create index if not exists fantasy_league_snapshots_league_captured_idx
  on public.fantasy_league_snapshots (league_id, captured_at desc);

alter table public.fantasy_league_snapshots enable row level security;

-- ---------------------------------------------------------------------------
-- Operaciones detectadas.
--
-- `transaction_external_id` es un hash estable de (liga, tipo, jugador, partes,
-- foto anterior). LALIGA no da ids de operacion, asi que esta clave es la unica
-- proteccion real contra duplicados: re-sincronizar contra la misma foto previa
-- vuelve a producir el mismo id y el ON CONFLICT lo absorbe.
--
-- `amount` es NULLABLE a proposito: cuando el importe no es atribuible se deja
-- vacio. Un 0 aqui significaria "la operacion costo cero euros", que es una
-- afirmacion muy distinta de "no lo sabemos".
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_transactions (
  id uuid primary key default gen_random_uuid(),
  league_id text not null,
  transaction_external_id text not null,
  transaction_type text not null,
  occurred_at timestamptz not null,
  observed_from timestamptz not null,
  observed_to timestamptz not null,
  buyer_manager_id text,
  seller_manager_id text,
  player_id text not null,
  amount bigint,
  amount_basis text not null,
  raw_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (league_id, transaction_external_id)
);

create index if not exists fantasy_transactions_league_occurred_idx
  on public.fantasy_transactions (league_id, occurred_at);
create index if not exists fantasy_transactions_buyer_idx
  on public.fantasy_transactions (league_id, buyer_manager_id);
create index if not exists fantasy_transactions_seller_idx
  on public.fantasy_transactions (league_id, seller_manager_id);

alter table public.fantasy_transactions enable row level security;

-- ---------------------------------------------------------------------------
-- Ingreso por puntos: 100.000 EUR por punto.
--
-- La unique de (league_id, manager_id, matchday) es la que impide contar dos
-- veces la misma jornada. La escritura es UPSERT con valor ABSOLUTO (nunca un
-- incremento): sincronizar N veces deja exactamente el mismo importe que
-- sincronizar una. Ver `economy/points.ts`.
-- ---------------------------------------------------------------------------
create table if not exists public.fantasy_point_income (
  id uuid primary key default gen_random_uuid(),
  league_id text not null,
  manager_id text not null,
  matchday integer not null,
  points integer not null,
  amount bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, manager_id, matchday)
);

create index if not exists fantasy_point_income_league_manager_idx
  on public.fantasy_point_income (league_id, manager_id);

alter table public.fantasy_point_income enable row level security;
