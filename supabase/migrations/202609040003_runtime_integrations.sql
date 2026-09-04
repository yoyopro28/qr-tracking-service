create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.upsert_runtime_secret(p_name text, p_value text, p_description text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_id uuid;
begin
  select id into secret_id from vault.secrets where name = p_name;
  if secret_id is null then
    perform vault.create_secret(p_value, p_name, p_description);
  else
    perform vault.update_secret(secret_id, p_value, p_name, p_description);
  end if;
end
$$;

create or replace function private.wake_redirect_cache_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sync_url text;
  sync_secret text;
begin
  select decrypted_secret into sync_url from vault.decrypted_secrets where name = 'qr_cache_sync_url';
  select decrypted_secret into sync_secret from vault.decrypted_secrets where name = 'qr_cache_sync_secret';
  if sync_url is null or sync_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := sync_url || '/webhook',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', sync_secret
    ),
    body := jsonb_build_object('eventId', new.id, 'slug', new.slug)
  );
  return new;
end
$$;

drop trigger if exists redirect_cache_outbox_wake on public.redirect_cache_outbox;
create trigger redirect_cache_outbox_wake
after insert on public.redirect_cache_outbox
for each row execute function private.wake_redirect_cache_sync();

create or replace function public.configure_runtime_integrations(
  p_project_url text,
  p_publishable_key text,
  p_cache_sync_url text,
  p_sync_secret text,
  p_rollup_secret text,
  p_maintenance_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_job bigint;
begin
  p_project_url := rtrim(p_project_url, '/');
  p_cache_sync_url := rtrim(p_cache_sync_url, '/');
  if p_project_url !~ '^https://[^/]+$' or p_cache_sync_url !~ '^https://[^/]+$' then
    raise exception 'runtime integration URLs must be HTTPS origins';
  end if;
  if length(p_publishable_key) < 20 or length(p_sync_secret) < 32 or length(p_rollup_secret) < 32 or length(p_maintenance_secret) < 32 then
    raise exception 'runtime integration secrets are too short';
  end if;

  perform private.upsert_runtime_secret('qr_project_url', p_project_url, 'Supabase project origin used by scheduled Edge Functions');
  perform private.upsert_runtime_secret('qr_publishable_key', p_publishable_key, 'Publishable key used as the Edge Function apikey header');
  perform private.upsert_runtime_secret('qr_cache_sync_url', p_cache_sync_url, 'Cloudflare cache-sync Worker origin');
  perform private.upsert_runtime_secret('qr_cache_sync_secret', p_sync_secret, 'Shared cache-sync webhook secret');
  perform private.upsert_runtime_secret('qr_rollup_secret', p_rollup_secret, 'Analytics rollup cron secret');
  perform private.upsert_runtime_secret('qr_maintenance_secret', p_maintenance_secret, 'Stale reservation cleanup cron secret');

  for existing_job in select jobid from cron.job where jobname in ('qr-analytics-rollup-daily', 'qr-stale-reservations-daily') loop
    perform cron.unschedule(existing_job);
  end loop;

  perform cron.schedule(
    'qr-analytics-rollup-daily',
    '15 2 * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'qr_project_url') || '/functions/v1/rollup-scan-analytics',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'qr_publishable_key'),
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'qr_rollup_secret')
        ),
        body := '{}'::jsonb
      );
    $job$
  );

  perform cron.schedule(
    'qr-stale-reservations-daily',
    '45 2 * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'qr_project_url') || '/functions/v1/cleanup-stale-reservations',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'qr_publishable_key'),
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'qr_maintenance_secret')
        ),
        body := '{}'::jsonb
      );
    $job$
  );
end
$$;

revoke all on function private.upsert_runtime_secret(text, text, text) from public, anon, authenticated;
revoke all on function private.wake_redirect_cache_sync() from public, anon, authenticated;
revoke all on function public.configure_runtime_integrations(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.configure_runtime_integrations(text, text, text, text, text, text) to service_role;
