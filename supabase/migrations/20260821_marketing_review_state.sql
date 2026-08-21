-- El estado humano del panel privado de marketing: aprobaciones, rechazos,
-- ediciones y auditoría de cada pieza de la Creative Factory.
--
-- ── Por qué esto no puede depender de service_role ───────────────────────────
-- Esta base de datos no tiene `SUPABASE_SERVICE_ROLE_KEY` configurada en
-- producción (se comprobó arreglando el acceso social del producto). Un panel
-- que solo funcionara con esa clave estaría tan roto como estaba "entrar con
-- Google" antes de esa corrección. Así que, igual que `fantasy_links`, esta
-- tabla se abre a quien haya entrado con su JWT propio — pero solo a UNA
-- identidad: la del dueño del proyecto, no la de cualquier manager de LigaLab.
--
-- ── Por qué el correo no vive en esta migración ──────────────────────────────
-- El repositorio es PÚBLICO. La lista de quién administra el panel se guarda
-- como un dato en tiempo de ejecución (misma idea que `app_secrets.enlaces`),
-- nunca en un fichero versionado. Se siembra aparte, con una sentencia SQL que
-- no se comitea.

create table if not exists public.marketing_review_state (
  content_id text primary key,
  -- Todo el estado humano en un solo jsonb, validado por Zod en la aplicación
  -- (`estadoHumanoSchema`). Evita una migración nueva cada vez que se añade un
  -- campo a algo que, por ahora, solo lee y escribe esta misma app.
  datos jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketing_review_state enable row level security;

-- A diferencia de `app_secrets` (mas abajo), aqui NO se revocan los permisos
-- base de la tabla: RLS necesita que el rol tenga el GRANT de partida para
-- poder filtrar filas. `anon` no recibe ningun grant —nunca alcanza esta
-- tabla— y `authenticated` recibe el minimo para que la politica de abajo
-- tenga algo que filtrar.
grant select, insert, update on public.marketing_review_state to authenticated;

-- Reutiliza el mismo almacén de secretos que `clave_de_enlace()`: RLS
-- activado, cero políticas, solo legible a través de una función que nunca
-- devuelve el valor en crudo a quien no corresponda.
create table if not exists public.app_secrets (
  nombre text primary key,
  valor text not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Si esta pieza aún no existe (despliegues que no pasaron por la migración
-- del acceso social), se crea vacía. Sembrar el admin de verdad es un paso
-- aparte, fuera de git.
insert into public.app_secrets (nombre, valor)
values ('marketing_admins', '')
on conflict (nombre) do nothing;

-- Es el propio correo verificado por Supabase (`auth.jwt()->>'email'`) el que
-- decide, no un `auth.uid()` fijo: así cambiar quién administra el panel es
-- una fila en `app_secrets`, no una migración nueva.
create or replace function public.es_admin_de_marketing()
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  correo text := lower(coalesce(auth.jwt() ->> 'email', ''));
  admins text;
begin
  if correo = '' then
    return false;
  end if;

  select valor into admins from public.app_secrets where nombre = 'marketing_admins';
  if admins is null or admins = '' then
    return false;
  end if;

  return correo = any(string_to_array(lower(admins), ','));
end;
$$;

revoke all on function public.es_admin_de_marketing() from public, anon;
grant execute on function public.es_admin_de_marketing() to authenticated;

create policy "el admin de marketing lee el estado"
  on public.marketing_review_state
  for select
  to authenticated
  using (public.es_admin_de_marketing());

create policy "el admin de marketing escribe el estado"
  on public.marketing_review_state
  for insert
  to authenticated
  with check (public.es_admin_de_marketing());

create policy "el admin de marketing actualiza el estado"
  on public.marketing_review_state
  for update
  to authenticated
  using (public.es_admin_de_marketing())
  with check (public.es_admin_de_marketing());

-- Sin política de DELETE a propósito: nada en el panel borra estado, y el
-- historial de auditoría no debe poder desaparecer con una petición HTTP.

-- El linter de Supabase marca `es_admin_de_marketing()` con
-- `authenticated_security_definer_function_executable`, igual que marcó
-- `clave_de_enlace()`, y por la misma razón: cualquiera que haya entrado puede
-- LLAMARLA, pero lo único que devuelve es un booleano derivado de SU PROPIO
-- correo verificado, nunca el secreto ni el correo de otra persona. Es a
-- propósito: sin poder llamarla, ni el propio panel podría preguntar «¿soy
-- yo?». Verificado contra la base real: un correo que no es el admin no
-- puede escribir ni leer una sola fila de `marketing_review_state`, y `anon`
-- no alcanza ni la función ni la tabla.
