create or replace function public.archive_template(p_workspace_id uuid, p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'workspace access denied';
  end if;

  update public.templates
  set status = 'ARCHIVED'
  where id = p_template_id
    and workspace_id = p_workspace_id
    and status in ('READY', 'FAILED');

  if not found then
    raise exception 'template not found or cannot be archived';
  end if;
end
$$;

create or replace function public.retire_flyer(p_workspace_id uuid, p_flyer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'workspace access denied';
  end if;

  update public.activations
  set ended_at = now()
  where flyer_id = p_flyer_id
    and workspace_id = p_workspace_id
    and ended_at is null;

  update public.flyers
  set status = 'RETIRED', retired_at = now()
  where id = p_flyer_id
    and workspace_id = p_workspace_id
    and status <> 'RETIRED';

  if not found then
    raise exception 'flyer not found or already retired';
  end if;
end
$$;

create or replace function public.delete_unused_location(p_workspace_id uuid, p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'workspace access denied';
  end if;

  if exists (
    select 1 from public.activations
    where workspace_id = p_workspace_id and location_id = p_location_id
  ) then
    raise exception 'location has activation history and must be archived';
  end if;

  delete from public.locations
  where id = p_location_id and workspace_id = p_workspace_id;

  if not found then
    raise exception 'location not found';
  end if;
end
$$;

drop function if exists public.activate_flyer(uuid, text, uuid, text, double precision, double precision);

create function public.activate_flyer(
  p_workspace_id uuid,
  p_shortcode text,
  p_location_id uuid default null,
  p_new_location_name text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_source public.activation_source default 'MANUAL_ADMIN_ENTRY'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  flyer public.flyers;
  location_id uuid := p_location_id;
begin
  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'workspace access denied';
  end if;

  select * into flyer
  from public.flyers
  where workspace_id = p_workspace_id
    and shortcode = upper(trim(p_shortcode))
  for update;

  if flyer.id is null or flyer.status in ('RESERVED', 'RETIRED') then
    raise exception 'eligible flyer not found';
  end if;

  if exists(select 1 from public.activations where flyer_id = flyer.id and ended_at is null) then
    raise exception 'flyer already activated';
  end if;

  if location_id is null then
    if nullif(trim(p_new_location_name), '') is null then
      raise exception 'location is required';
    end if;

    insert into public.locations(workspace_id, campaign_id, name, latitude, longitude)
    values(p_workspace_id, flyer.campaign_id, trim(p_new_location_name), p_latitude, p_longitude)
    returning id into location_id;
  elsif not exists(
    select 1 from public.locations
    where id = location_id
      and workspace_id = p_workspace_id
      and archived_at is null
      and (campaign_id is null or campaign_id = flyer.campaign_id)
  ) then
    raise exception 'location not found';
  end if;

  insert into public.activations(workspace_id, flyer_id, location_id, activated_by_user_id, source)
  values(p_workspace_id, flyer.id, location_id, auth.uid(), p_source);

  update public.flyers
  set status = 'ACTIVATED', activated_at = now()
  where id = flyer.id;
end
$$;

create or replace function public.expire_stale_uploads()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  failed_templates integer;
  cancelled_batches integer;
begin
  update public.templates
  set status = 'FAILED'
  where status = 'UPLOADING' and created_at < now() - interval '24 hours';
  get diagnostics failed_templates = row_count;

  update public.flyer_batches
  set status = 'CANCELLED'
  where status = 'RESERVED' and created_at < now() - interval '24 hours';
  get diagnostics cancelled_batches = row_count;

  update public.flyers
  set status = 'RETIRED', retired_at = now()
  where status = 'RESERVED'
    and batch_id in (select id from public.flyer_batches where status = 'CANCELLED');

  return jsonb_build_object(
    'failedTemplates', failed_templates,
    'cancelledBatches', cancelled_batches
  );
end
$$;

revoke all on function public.archive_template(uuid, uuid) from public, anon;
revoke all on function public.retire_flyer(uuid, uuid) from public, anon;
revoke all on function public.delete_unused_location(uuid, uuid) from public, anon;
revoke all on function public.activate_flyer(uuid, text, uuid, text, double precision, double precision, public.activation_source) from public, anon;
revoke all on function public.expire_stale_uploads() from public, anon, authenticated;

grant execute on function public.archive_template(uuid, uuid) to authenticated;
grant execute on function public.retire_flyer(uuid, uuid) to authenticated;
grant execute on function public.delete_unused_location(uuid, uuid) to authenticated;
grant execute on function public.activate_flyer(uuid, text, uuid, text, double precision, double precision, public.activation_source) to authenticated;
grant execute on function public.expire_stale_uploads() to service_role;
