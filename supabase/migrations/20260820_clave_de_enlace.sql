-- Una clave de cifrado que no depende de ninguna variable de entorno.
--
-- ── El atasco que esto resuelve ──────────────────────────────────────────────
-- El enlace con LALIGA hay que guardarlo cifrado, y para eso hace falta una
-- clave que NO cambie entre despliegues: si cambia, la fila queda ilegible y el
-- usuario ve «ya conectaste LALIGA» sin poder entrar, que es peor que no haber
-- guardado nada.
--
-- La única clave estable disponible era `SESSION_ENCRYPTION_KEY` en Vercel. Sin
-- ella no se guardaba nada, y entonces «entrar con Google» no le ahorraba nada a
-- nadie: te identificaba y acto seguido te pedía la contraseña igual. O sea que
-- el botón dependía de que alguien entrara a un panel a pegar una variable.
--
-- Aquí la clave la deriva la propia base de datos. Es estable porque la raíz no
-- cambia, y es distinta para cada persona porque se deriva de su identidad.
--
-- ── Lo que hay que saber del compromiso ─────────────────────────────────────
-- La raíz vive en la misma base que las filas cifradas. Quien se lleve una copia
-- COMPLETA de la base se lleva las dos mitades. Con `SESSION_ENCRYPTION_KEY`
-- puesta no: la aplicación mezcla las dos claves, y entonces haría falta a la vez
-- una copia de la base y la variable de Vercel. Por eso la variable sigue
-- mereciendo la pena, pero ya no es lo que bloquea la función.

-- Secretos del servidor. Nadie los lee por la API: RLS activado y CERO políticas,
-- y además se revoca el acceso a los roles que la API usa. La única vía de
-- lectura es la función de abajo, que corre como su dueño y no devuelve el
-- secreto sino algo derivado de él.
create table if not exists public.app_secrets (
  nombre text primary key,
  valor text not null,
  created_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- La raíz se genera AQUÍ DENTRO. No pasa por ningún sitio donde pueda quedar
-- escrita: ni por un log, ni por una consola, ni por un fichero.
insert into public.app_secrets (nombre, valor)
values ('enlaces', encode(extensions.gen_random_bytes(48), 'base64'))
on conflict (nombre) do nothing;

-- La clave con la que se cifra TU enlace con LALIGA.
--
-- `security definer` es lo que le deja leer la raíz; el `search_path` fijo evita
-- que alguien la engañe creando funciones con el mismo nombre en otro esquema.
--
-- `quien` solo hace falta en el camino sin usuario delante: cuando la app tiene
-- clave administrativa puede rehacer tu sesión a partir del enlace sin que hayas
-- vuelto a pasar por el proveedor, y ahí `auth.uid()` no existe. Pedir la clave
-- de otro solo lo puede hacer `service_role`, que de todas formas ya lee la tabla
-- entera. Un usuario normal obtiene la suya aunque pase otro identificador a
-- propósito.
create or replace function public.clave_de_enlace(quien uuid default null)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  yo uuid := auth.uid();
  sujeto uuid;
  raiz text;
begin
  if yo is not null then
    if quien is not null and quien <> yo then
      raise exception 'No se puede pedir la clave de otra persona.';
    end if;
    sujeto := yo;
  else
    if current_setting('role', true) is distinct from 'service_role' then
      raise exception 'Esta funcion solo responde a quien ha entrado.';
    end if;
    sujeto := quien;
  end if;

  if sujeto is null then
    raise exception 'Falta de quien es la clave.';
  end if;

  select valor into raiz from public.app_secrets where nombre = 'enlaces';
  if raiz is null then
    raise exception 'Falta la raiz de derivacion.';
  end if;

  return encode(extensions.hmac(sujeto::text, raiz, 'sha256'), 'base64');
end;
$$;

revoke all on function public.clave_de_enlace(uuid) from public, anon;
grant execute on function public.clave_de_enlace(uuid) to authenticated, service_role;

-- El linter de Supabase marca esta función con `authenticated_security_definer_
-- function_executable`, y tiene razón en señalarla: es una función que salta RLS
-- y que puede llamar cualquiera que haya entrado. Es a propósito, y es justo lo
-- que la hace útil. Lo que la mantiene segura no es quién puede llamarla, sino
-- que solo devuelve algo derivado de la identidad DE QUIEN LLAMA. Comprobado:
-- un usuario no obtiene la clave de otro ni pasándole su identificador, `anon`
-- no la alcanza siquiera por el permiso, y la raíz no se puede leer por la API.
