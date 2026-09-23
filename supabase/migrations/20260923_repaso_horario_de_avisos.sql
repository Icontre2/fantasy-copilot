-- Repaso de avisos cada hora (06:05–22:05 UTC).
--
-- El plan de Vercel solo permite un cron al día (vercel.json, 09:00 UTC), y
-- con un repaso diario un aviso de «Ana ya puede pagar tu cláusula» llega
-- tarde. Este job llama a la misma ruta, `/api/cron/alerts`, cada hora.
--
-- El secreto NO va aquí: se lee de Supabase Vault (`cron_secret_ligalab`), que
-- debe tener el mismo valor que CRON_SECRET en Vercel. Para crearlo:
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret_ligalab');
-- Si se rota CRON_SECRET en Vercel, hay que actualizarlo también en Vault:
--   select vault.update_secret(id, '<nuevo>') from vault.secrets where name = 'cron_secret_ligalab';
--
-- Efecto secundario útil: consultar la base cada hora evita que el plan
-- gratuito de Supabase pause el proyecto por inactividad.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'ligalab-avisos-horario';
select cron.schedule(
  'ligalab-avisos-horario',
  '5 6-22 * * *',
  $$
  select net.http_get(
    url := 'https://fantasy-copilot-sigma.vercel.app/api/cron/alerts',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_ligalab')
    ),
    timeout_milliseconds := 60000
  );
  $$
);
