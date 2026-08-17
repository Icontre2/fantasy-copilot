-- Enlace entre una identidad social (Google, y mañana quizá otra) y la cuenta
-- de LALIGA de esa persona.
--
-- Entrar con Google dice QUIÉN eres, pero no da ningún permiso sobre LALIGA:
-- son dos accesos distintos y LALIGA no sabe nada de Google. Por eso la primera
-- vez hay que conectar la cuenta de LALIGA con su email y su contraseña, y esta
-- tabla es lo que recuerda cuál es para no volver a pedirla.
--
-- Igual que `fantasy_sessions`: RLS ACTIVADO y CERO políticas. Sin política, RLS
-- deniega a `anon` y a `authenticated`; `service_role` la salta por definición y
-- es el único que escribe aquí. Es deny-by-default, no un descuido.

create table if not exists public.fantasy_links (
  -- `proveedor:sub`, por ejemplo `google:1076915035...`. Lleva el proveedor
  -- delante para que dos identidades distintas con el mismo `sub` no puedan
  -- acabar compartiendo cuenta.
  id text primary key,

  -- Tokens de LALIGA cifrados en la aplicación (AES-256-GCM). La base nunca ve
  -- un token en claro, ni siquiera con acceso directo a la fila.
  encrypted_tokens text not null,

  -- Con qué correo de LALIGA se conectó. Solo para poder enseñarlo («conectado
  -- como …») y reconocer la fila desde el panel. No sirve para entrar.
  laliga_email text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fantasy_links enable row level security;
