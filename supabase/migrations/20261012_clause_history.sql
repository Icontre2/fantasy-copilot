-- Histórico real de cambios de cláusula de LALIGA Fantasy.
-- Las tablas solo las escribe/lee el servidor con service_role; RLS sin políticas.
create table if not exists public.fantasy_clause_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.fantasy_sessions(id) on delete cascade,
  league_id text not null,
  team_id text not null,
  manager_id text not null,
  manager_name text not null,
  player_id text not null,
  player_name text not null,
  market_value bigint,
  buyout_clause bigint,
  shielded_until timestamptz,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (session_id, league_id, player_id, captured_at)
);
create index if not exists fantasy_clause_snapshots_latest_idx
  on public.fantasy_clause_snapshots (session_id, league_id, captured_at desc);
alter table public.fantasy_clause_snapshots enable row level security;

create table if not exists public.fantasy_clause_changes (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.fantasy_sessions(id) on delete cascade,
  league_id text not null,
  player_id text not null,
  player_name text not null,
  previous_manager_id text,
  previous_manager_name text,
  current_manager_id text not null,
  current_manager_name text not null,
  previous_clause bigint,
  current_clause bigint,
  change_amount bigint,
  event_type text not null check (event_type in ('INCREASE', 'DECREASE', 'ADDED', 'REMOVED')),
  market_value bigint,
  previous_snapshot_at timestamptz not null,
  current_snapshot_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (session_id, league_id, player_id, previous_snapshot_at, current_snapshot_at)
);
create index if not exists fantasy_clause_changes_latest_idx
  on public.fantasy_clause_changes (session_id, league_id, current_snapshot_at desc);
alter table public.fantasy_clause_changes enable row level security;

-- Un repaso diario. Reutiliza el secreto que ya autoriza el cron de alertas.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'ligalab-clause-snapshots';
select cron.schedule(
  'ligalab-clause-snapshots',
  '15 7 * * *',
  $$
  select net.http_get(
    url := 'https://fantasy-copilot-sigma.vercel.app/api/cron/clause-snapshots',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_ligalab')
    ),
    timeout_milliseconds := 60000
  );
  $$
);
