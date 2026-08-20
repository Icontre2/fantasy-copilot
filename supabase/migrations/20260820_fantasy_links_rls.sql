-- Que cada uno pueda tocar SU enlace, y solo el suyo.
--
-- ── Por qué ──────────────────────────────────────────────────────────────────
-- La tabla se creó con RLS activado y cero políticas: deny-by-default, y solo
-- `service_role` escribía. El problema es que esa clave no está configurada en
-- el despliegue, así que el enlace no se guardaba nunca y «entrar con Google»
-- terminaba pidiendo la contraseña de LALIGA igual. Un botón que no servía.
--
-- Con esta política ya no hace falta clave administrativa: al volver del
-- proveedor, la app habla con la base usando el JWT del propio usuario, y
-- Postgres se encarga de que solo alcance su fila.
--
-- `service_role` sigue saltándose RLS por definición, así que donde sí esté
-- configurada todo funciona igual que antes.
--
-- ── La forma del identificador ───────────────────────────────────────────────
-- `id` es `proveedor:sub`. Para las identidades de Supabase eso es
-- `supabase:<auth.uid()>`, y la política ata exactamente esa forma: nadie puede
-- escribir una fila con el prefijo de otro ni con el uid de otro.

create policy "cada identidad lee su enlace"
  on public.fantasy_links
  for select
  to authenticated
  using (id = 'supabase:' || (select auth.uid())::text);

create policy "cada identidad crea su enlace"
  on public.fantasy_links
  for insert
  to authenticated
  with check (id = 'supabase:' || (select auth.uid())::text);

create policy "cada identidad actualiza su enlace"
  on public.fantasy_links
  for update
  to authenticated
  using (id = 'supabase:' || (select auth.uid())::text)
  with check (id = 'supabase:' || (select auth.uid())::text);

create policy "cada identidad borra su enlace"
  on public.fantasy_links
  for delete
  to authenticated
  using (id = 'supabase:' || (select auth.uid())::text);

-- `anon` no aparece en ninguna política: sin haber entrado no se ve nada. Y como
-- los tokens van cifrados en la aplicación, ni siquiera el dueño de la fila —ni
-- quien tenga acceso directo a la base— puede leer un token de LALIGA desde
-- aquí.
