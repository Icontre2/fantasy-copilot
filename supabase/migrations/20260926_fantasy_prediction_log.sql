-- Registro del predictor de puntos: qué predijo antes de cada jornada, para
-- poder decir después cuánto acertó (ver src/server/predictions/registro.ts).
--
-- Una fila por liga, manager y jornada. Se sobrescribe mientras la jornada no
-- ha empezado y se congela en cuanto empieza el primer partido: esa regla la
-- aplica la ruta, no la base.
--
-- RLS activado y SIN políticas: solo el servidor (service_role) lee y escribe.
-- El navegador nunca habla con esta tabla directamente.
create table if not exists public.fantasy_prediction_log (
  league_id text not null,
  manager_id text not null,
  jornada integer not null check (jornada between 1 and 60),
  formacion text not null,
  total numeric not null,
  jugadores jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (league_id, manager_id, jornada)
);

alter table public.fantasy_prediction_log enable row level security;
