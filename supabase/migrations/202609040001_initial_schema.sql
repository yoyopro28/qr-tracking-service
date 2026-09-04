create extension if not exists pgcrypto with schema extensions;

create type public.workspace_role as enum ('OWNER');
create type public.campaign_status as enum ('DRAFT', 'ACTIVE', 'ARCHIVED');
create type public.template_status as enum ('UPLOADING', 'READY', 'FAILED', 'ARCHIVED');
create type public.flyer_batch_status as enum ('RESERVED', 'GENERATED', 'STORED', 'FINALIZED', 'CANCELLED');
create type public.flyer_status as enum ('RESERVED', 'GENERATED', 'PRINTED', 'ACTIVATED', 'RETIRED');
create type public.activation_source as enum ('ADMIN_SCAN', 'MANUAL_ADMIN_ENTRY');
create type public.qr_route_status as enum ('ACTIVE', 'DISABLED');
create type public.outbox_status as enum ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'OWNER',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members(user_id);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  destination_url text not null check (destination_url ~ '^https?://'),
  status public.campaign_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create index campaigns_workspace_idx on public.campaigns(workspace_id);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type = 'application/pdf'),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 15728640),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  page_count integer not null check (page_count > 0),
  width numeric(10,2),
  height numeric(10,2),
  status public.template_status not null default 'UPLOADING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_campaign_tenant_fk foreign key (campaign_id, workspace_id)
    references public.campaigns(id, workspace_id)
);
create index templates_workspace_campaign_idx on public.templates(workspace_id, campaign_id);

create table public.template_qr_placements (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  placement_order integer not null check (placement_order >= 0),
  x numeric(10,2) not null check (x >= 0),
  y numeric(10,2) not null check (y >= 0),
  width numeric(10,2) not null check (width > 0),
  height numeric(10,2) not null check (height > 0),
  short_text_enabled boolean not null default false,
  short_text_offset_x numeric(10,2),
  short_text_offset_y numeric(10,2),
  unique (template_id, placement_order)
);

create table public.flyer_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete restrict,
  sheet_count integer not null check (sheet_count between 1 and 250),
  physical_flyer_count integer not null check (physical_flyer_count > 0),
  storage_path text not null unique,
  file_size_bytes bigint,
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  tracking_origin text not null check (tracking_origin ~ '^https?://'),
  status public.flyer_batch_status not null default 'RESERVED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz
);
create index flyer_batches_workspace_campaign_idx on public.flyer_batches(workspace_id, campaign_id);

create table public.flyers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete restrict,
  batch_id uuid not null references public.flyer_batches(id) on delete cascade,
  shortcode text not null unique check (shortcode ~ '^[A-Z0-9]{8}$'),
  tracking_url text not null,
  sheet_index integer not null check (sheet_index >= 0),
  placement_index integer not null check (placement_index >= 0),
  status public.flyer_status not null default 'RESERVED',
  generated_at timestamptz,
  activated_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, sheet_index, placement_index)
);
create index flyers_workspace_campaign_idx on public.flyers(workspace_id, campaign_id);
create index flyers_batch_idx on public.flyers(batch_id);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  description text,
  address_line_1 text,
  address_line_2 text,
  postal_code text,
  city text,
  country text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);
create index locations_workspace_idx on public.locations(workspace_id);

create table public.activations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  flyer_id uuid not null references public.flyers(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  activated_by_user_id uuid references auth.users(id) on delete set null,
  source public.activation_source not null,
  notes text,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index activations_one_active_per_flyer on public.activations(flyer_id) where ended_at is null;
create index activations_workspace_idx on public.activations(workspace_id);

create table public.qr_routes (
  slug text primary key check (slug ~ '^[A-Z0-9]{8}$'),
  destination_url text,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  flyer_id uuid not null unique references public.flyers(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  status public.qr_route_status not null,
  version bigint not null default 1 check (version > 0),
  cache_version bigint not null default 0 check (cache_version >= 0),
  cache_synced_at timestamptz,
  cache_error text,
  updated_at timestamptz not null default now(),
  check ((status = 'ACTIVE' and destination_url is not null) or status = 'DISABLED')
);
create index qr_routes_unsynced_idx on public.qr_routes(cache_version, version) where cache_version < version;

create table public.redirect_cache_outbox (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  route_version bigint not null,
  status public.outbox_status not null default 'PENDING',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (slug, route_version)
);
create index redirect_outbox_claim_idx on public.redirect_cache_outbox(status, available_at, created_at);

create table public.scan_rollups_daily (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  flyer_id uuid not null references public.flyers(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  country_code text not null default '',
  scans bigint not null check (scans >= 0),
  unique_ip_days bigint not null check (unique_ip_days >= 0),
  updated_at timestamptz not null default now()
);
create unique index scan_rollups_daily_dimensions_unique on public.scan_rollups_daily(day, workspace_id, campaign_id, flyer_id, location_id, country_code) nulls not distinct;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_workspaces before update on public.workspaces for each row execute function public.touch_updated_at();
create trigger touch_campaigns before update on public.campaigns for each row execute function public.touch_updated_at();
create trigger touch_templates before update on public.templates for each row execute function public.touch_updated_at();
create trigger touch_flyer_batches before update on public.flyer_batches for each row execute function public.touch_updated_at();
create trigger touch_flyers before update on public.flyers for each row execute function public.touch_updated_at();
create trigger touch_locations before update on public.locations for each row execute function public.touch_updated_at();

create or replace function public.is_workspace_member(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members wm where wm.workspace_id = p_workspace_id and wm.user_id = auth.uid())
$$;
create or replace function public.is_workspace_owner(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members wm where wm.workspace_id = p_workspace_id and wm.user_id = auth.uid() and wm.role = 'OWNER')
$$;
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_owner(uuid) from public;
grant execute on function public.is_workspace_member(uuid), public.is_workspace_owner(uuid) to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare workspace_id uuid := gen_random_uuid();
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  insert into public.workspaces(id, name, slug) values (workspace_id, coalesce(split_part(new.email, '@', 1), 'Workspace') || '''s Workspace', 'personal-' || replace(left(new.id::text, 13), '-', ''));
  insert into public.workspace_members(workspace_id, user_id, role) values (workspace_id, new.id, 'OWNER');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.campaigns enable row level security;
alter table public.templates enable row level security;
alter table public.template_qr_placements enable row level security;
alter table public.flyer_batches enable row level security;
alter table public.flyers enable row level security;
alter table public.locations enable row level security;
alter table public.activations enable row level security;
alter table public.qr_routes enable row level security;
alter table public.redirect_cache_outbox enable row level security;
alter table public.scan_rollups_daily enable row level security;

create policy profiles_self on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy workspaces_member_read on public.workspaces for select to authenticated using (public.is_workspace_member(id));
create policy workspaces_owner_write on public.workspaces for update to authenticated using (public.is_workspace_owner(id)) with check (public.is_workspace_owner(id));
create policy members_member_read on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));
create policy members_owner_write on public.workspace_members for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy campaigns_member_read on public.campaigns for select to authenticated using (public.is_workspace_member(workspace_id));
create policy campaigns_owner_write on public.campaigns for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy templates_member_read on public.templates for select to authenticated using (public.is_workspace_member(workspace_id));
create policy placements_member_read on public.template_qr_placements for select to authenticated using (exists(select 1 from public.templates t where t.id = template_id and public.is_workspace_member(t.workspace_id)));
create policy batches_member_read on public.flyer_batches for select to authenticated using (public.is_workspace_member(workspace_id));
create policy flyers_member_read on public.flyers for select to authenticated using (public.is_workspace_member(workspace_id));
create policy locations_member_read on public.locations for select to authenticated using (public.is_workspace_member(workspace_id));
create policy locations_owner_write on public.locations for all to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy activations_member_read on public.activations for select to authenticated using (public.is_workspace_member(workspace_id));
create policy routes_member_read on public.qr_routes for select to authenticated using (public.is_workspace_member(workspace_id));
create policy rollups_member_read on public.scan_rollups_daily for select to authenticated using (public.is_workspace_member(workspace_id));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('templates', 'templates', false, 15728640, array['application/pdf']),
  ('generated-flyers', 'generated-flyers', false, 52428800, array['application/pdf']),
  ('assets', 'assets', false, 15728640, null)
on conflict (id) do nothing;

create or replace function public.can_access_storage_object(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare workspace_id uuid;
begin
  workspace_id := split_part(object_name, '/', 1)::uuid;
  return public.is_workspace_member(workspace_id);
exception when invalid_text_representation then return false;
end $$;
revoke all on function public.can_access_storage_object(text) from public;
grant execute on function public.can_access_storage_object(text) to authenticated;
create policy private_files_read on storage.objects for select to authenticated using (bucket_id in ('templates','generated-flyers','assets') and public.can_access_storage_object(name));
create policy private_files_insert on storage.objects for insert to authenticated with check (bucket_id in ('templates','generated-flyers','assets') and public.can_access_storage_object(name));
create policy private_files_update on storage.objects for update to authenticated using (bucket_id in ('templates','generated-flyers','assets') and public.can_access_storage_object(name)) with check (bucket_id in ('templates','generated-flyers','assets') and public.can_access_storage_object(name));
create policy private_files_delete on storage.objects for delete to authenticated using (bucket_id in ('templates','generated-flyers','assets') and public.can_access_storage_object(name));

create or replace function public.reserve_template(
  p_workspace_id uuid, p_campaign_id uuid, p_filename text, p_mime_type text, p_file_size_bytes bigint,
  p_sha256 text, p_page_count integer, p_width numeric, p_height numeric, p_placements jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare template_id uuid := gen_random_uuid(); storage_path text; placement jsonb;
begin
  if not public.is_workspace_owner(p_workspace_id) then raise exception 'workspace access denied'; end if;
  if not exists(select 1 from public.campaigns where id = p_campaign_id and workspace_id = p_workspace_id) then raise exception 'campaign not found'; end if;
  if jsonb_array_length(p_placements) < 1 then raise exception 'at least one placement is required'; end if;
  storage_path := p_workspace_id || '/' || p_campaign_id || '/' || template_id || '/' || regexp_replace(p_filename, '[^a-zA-Z0-9._-]', '_', 'g');
  insert into public.templates(id, workspace_id, campaign_id, storage_path, original_filename, mime_type, file_size_bytes, sha256, page_count, width, height)
    values(template_id, p_workspace_id, p_campaign_id, storage_path, p_filename, p_mime_type, p_file_size_bytes, p_sha256, p_page_count, p_width, p_height);
  for placement in select value from jsonb_array_elements(p_placements) loop
    insert into public.template_qr_placements(template_id, page_number, placement_order, x, y, width, height, short_text_enabled, short_text_offset_x, short_text_offset_y)
    values(template_id, (placement->>'pageNumber')::integer, (placement->>'order')::integer, (placement->>'x')::numeric, (placement->>'y')::numeric,
      (placement->>'width')::numeric, (placement->>'height')::numeric, coalesce((placement->>'shortTextEnabled')::boolean, false),
      (placement->>'shortTextOffsetX')::numeric, (placement->>'shortTextOffsetY')::numeric);
  end loop;
  return jsonb_build_object('id', template_id, 'storagePath', storage_path);
end $$;

create or replace function public.finalize_template(p_template_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.templates;
begin
  select * into target from public.templates where id = p_template_id for update;
  if target.id is null or not public.is_workspace_owner(target.workspace_id) then raise exception 'template not found'; end if;
  if target.status <> 'UPLOADING' then raise exception 'template is not awaiting upload'; end if;
  if not exists(select 1 from storage.objects where bucket_id = 'templates' and name = target.storage_path) then raise exception 'template object is missing'; end if;
  update public.templates set status = 'READY' where id = target.id;
end $$;

create or replace function public.reserve_flyer_batch(p_workspace_id uuid, p_campaign_id uuid, p_template_id uuid, p_sheet_count integer, p_tracking_origin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare batch_id uuid := gen_random_uuid(); storage_path text; placement record; code text; flyer_rows jsonb := '[]'::jsonb; placement_count integer;
begin
  if not public.is_workspace_owner(p_workspace_id) then raise exception 'workspace access denied'; end if;
  if p_sheet_count not between 1 and 250 then raise exception 'sheet count must be between 1 and 250'; end if;
  if p_tracking_origin !~ '^https?://[^/]+$' then raise exception 'invalid tracking origin'; end if;
  if not exists(select 1 from public.templates where id = p_template_id and campaign_id = p_campaign_id and workspace_id = p_workspace_id and status = 'READY') then raise exception 'ready template not found'; end if;
  select count(*) into placement_count from public.template_qr_placements where template_id = p_template_id;
  if placement_count < 1 then raise exception 'template has no placements'; end if;
  storage_path := p_workspace_id || '/' || p_campaign_id || '/' || batch_id || '/flyer-batch.pdf';
  insert into public.flyer_batches(id, workspace_id, campaign_id, template_id, sheet_count, physical_flyer_count, storage_path, tracking_origin)
    values(batch_id, p_workspace_id, p_campaign_id, p_template_id, p_sheet_count, p_sheet_count * placement_count, storage_path, p_tracking_origin);
  for sheet in 0..p_sheet_count - 1 loop
    for placement in select placement_order from public.template_qr_placements where template_id = p_template_id order by placement_order loop
      loop
        code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
        exit when not exists(select 1 from public.flyers where shortcode = code);
      end loop;
      insert into public.flyers(workspace_id, campaign_id, template_id, batch_id, shortcode, tracking_url, sheet_index, placement_index)
        values(p_workspace_id, p_campaign_id, p_template_id, batch_id, code, p_tracking_origin || '/r/' || code, sheet, placement.placement_order);
      flyer_rows := flyer_rows || jsonb_build_array(jsonb_build_object('id', (select id from public.flyers where shortcode = code), 'shortcode', code, 'trackingUrl', p_tracking_origin || '/r/' || code, 'sheetIndex', sheet, 'placementIndex', placement.placement_order));
    end loop;
  end loop;
  return jsonb_build_object('id', batch_id, 'workspaceId', p_workspace_id, 'campaignId', p_campaign_id, 'templateId', p_template_id,
    'sheetCount', p_sheet_count, 'physicalFlyerCount', p_sheet_count * placement_count, 'trackingOrigin', p_tracking_origin,
    'storagePath', storage_path, 'status', 'RESERVED', 'flyers', flyer_rows);
end $$;

create or replace function public.refresh_qr_route(p_flyer_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare projection record; existing public.qr_routes; next_status public.qr_route_status; next_destination text;
begin
  select f.id, f.shortcode, f.workspace_id, f.campaign_id, f.status flyer_status, c.status campaign_status, c.destination_url,
    b.status batch_status, (select a.location_id from public.activations a where a.flyer_id = f.id and a.ended_at is null order by a.created_at desc limit 1) location_id
  into projection from public.flyers f join public.campaigns c on c.id = f.campaign_id join public.flyer_batches b on b.id = f.batch_id where f.id = p_flyer_id;
  if projection.id is null or projection.flyer_status = 'RESERVED' then return; end if;
  next_status := (case when projection.flyer_status = 'RETIRED' or projection.campaign_status <> 'ACTIVE' or projection.batch_status <> 'FINALIZED' then 'DISABLED' else 'ACTIVE' end)::public.qr_route_status;
  next_destination := case when next_status = 'ACTIVE' then projection.destination_url else null end;
  select * into existing from public.qr_routes where flyer_id = projection.id for update;
  if existing.flyer_id is null then
    insert into public.qr_routes(slug, destination_url, workspace_id, campaign_id, flyer_id, location_id, status)
      values(projection.shortcode, next_destination, projection.workspace_id, projection.campaign_id, projection.id, projection.location_id, next_status);
    insert into public.redirect_cache_outbox(slug, route_version) values(projection.shortcode, 1);
  elsif existing.status is distinct from next_status or existing.destination_url is distinct from next_destination or existing.location_id is distinct from projection.location_id then
    update public.qr_routes set destination_url = next_destination, location_id = projection.location_id, status = next_status,
      version = version + 1, cache_error = null, updated_at = now() where flyer_id = projection.id returning * into existing;
    insert into public.redirect_cache_outbox(slug, route_version) values(existing.slug, existing.version) on conflict do nothing;
  end if;
end $$;
revoke all on function public.refresh_qr_route(uuid) from public;

create or replace function public.on_flyer_route_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.refresh_qr_route(new.id); return new; end $$;
create trigger flyer_route_change after insert or update of status on public.flyers for each row execute function public.on_flyer_route_change();

create or replace function public.on_campaign_route_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare flyer record; begin if old.destination_url is distinct from new.destination_url or old.status is distinct from new.status then for flyer in select id from public.flyers where campaign_id = new.id loop perform public.refresh_qr_route(flyer.id); end loop; end if; return new; end $$;
create trigger campaign_route_change after update of destination_url, status on public.campaigns for each row execute function public.on_campaign_route_change();

create or replace function public.on_activation_route_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.refresh_qr_route(coalesce(new.flyer_id, old.flyer_id)); return coalesce(new, old); end $$;
create trigger activation_route_change after insert or update or delete on public.activations for each row execute function public.on_activation_route_change();

create or replace function public.finalize_flyer_batch(p_batch_id uuid, p_storage_path text, p_sha256 text, p_file_size_bytes bigint, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare batch public.flyer_batches;
begin
  select * into batch from public.flyer_batches where id = p_batch_id for update;
  if batch.id is null or not exists(select 1 from public.workspace_members where workspace_id = batch.workspace_id and user_id = p_user_id and role = 'OWNER') then raise exception 'batch not found'; end if;
  if batch.status <> 'RESERVED' or batch.storage_path <> p_storage_path then raise exception 'invalid batch state or path'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' or p_file_size_bytes <= 0 then raise exception 'invalid generated file metadata'; end if;
  update public.flyer_batches set status = 'FINALIZED', sha256 = p_sha256, file_size_bytes = p_file_size_bytes, finalized_at = now() where id = batch.id;
  update public.flyers set status = 'GENERATED', generated_at = now() where batch_id = batch.id;
  return jsonb_build_object('id', batch.id, 'workspaceId', batch.workspace_id, 'campaignId', batch.campaign_id,
    'templateId', batch.template_id, 'sheetCount', batch.sheet_count, 'physicalFlyerCount', batch.physical_flyer_count,
    'trackingOrigin', batch.tracking_origin, 'storagePath', batch.storage_path, 'sha256', p_sha256,
    'status', 'FINALIZED', 'cacheStatus', 'WRITE_ACCEPTED', 'flyers', '[]'::jsonb);
end $$;

create or replace function public.get_flyer_batch_as(p_batch_id uuid, p_user_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'workspaceId', b.workspace_id, 'campaignId', b.campaign_id, 'templateId', b.template_id,
    'sheetCount', b.sheet_count, 'physicalFlyerCount', b.physical_flyer_count, 'trackingOrigin', b.tracking_origin, 'storagePath', b.storage_path,
    'sha256', b.sha256, 'status', b.status,
    'cacheStatus', case
      when exists(select 1 from public.qr_routes r where r.flyer_id in (select id from public.flyers where batch_id = b.id) and r.cache_error is not null) then 'ERROR'
      when b.status = 'FINALIZED' and not exists(select 1 from public.qr_routes r where r.flyer_id in (select id from public.flyers where batch_id = b.id) and r.cache_version < r.version)
        and (select count(*) from public.qr_routes r where r.flyer_id in (select id from public.flyers where batch_id = b.id)) = b.physical_flyer_count then 'SYNCED'
      when b.status = 'FINALIZED' then 'WRITE_ACCEPTED' else 'PENDING' end,
    'flyers', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'shortcode', f.shortcode, 'trackingUrl', f.tracking_url, 'sheetIndex', f.sheet_index, 'placementIndex', f.placement_index) order by f.sheet_index, f.placement_index) from public.flyers f where f.batch_id = b.id), '[]'::jsonb))
  from public.flyer_batches b where b.id = p_batch_id and exists(select 1 from public.workspace_members wm where wm.workspace_id = b.workspace_id and wm.user_id = p_user_id)
$$;

create or replace function public.get_flyer_batch(p_batch_id uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select public.get_flyer_batch_as(p_batch_id, auth.uid())
$$;

create or replace function public.activate_flyer(p_workspace_id uuid, p_shortcode text, p_location_id uuid default null, p_new_location_name text default null, p_latitude double precision default null, p_longitude double precision default null)
returns void language plpgsql security definer set search_path = '' as $$
declare flyer public.flyers; location_id uuid := p_location_id;
begin
  if not public.is_workspace_owner(p_workspace_id) then raise exception 'workspace access denied'; end if;
  select * into flyer from public.flyers where workspace_id = p_workspace_id and shortcode = upper(trim(p_shortcode)) for update;
  if flyer.id is null or flyer.status in ('RESERVED','RETIRED') then raise exception 'eligible flyer not found'; end if;
  if exists(select 1 from public.activations where flyer_id = flyer.id and ended_at is null) then raise exception 'flyer already activated'; end if;
  if location_id is null then
    if nullif(trim(p_new_location_name), '') is null then raise exception 'location is required'; end if;
    insert into public.locations(workspace_id, campaign_id, name, latitude, longitude) values(p_workspace_id, flyer.campaign_id, trim(p_new_location_name), p_latitude, p_longitude) returning id into location_id;
  elsif not exists(select 1 from public.locations where id = location_id and workspace_id = p_workspace_id and archived_at is null and (campaign_id is null or campaign_id = flyer.campaign_id)) then raise exception 'location not found'; end if;
  insert into public.activations(workspace_id, flyer_id, location_id, activated_by_user_id, source) values(p_workspace_id, flyer.id, location_id, auth.uid(), 'MANUAL_ADMIN_ENTRY');
  update public.flyers set status = 'ACTIVATED', activated_at = now() where id = flyer.id;
end $$;

create or replace function public.claim_redirect_cache_events(p_limit integer default 100, p_lease_seconds integer default 60)
returns table(id uuid, slug text, route_version bigint) language plpgsql security definer set search_path = '' as $$
begin
  return query with claimed as (
    select o.id from public.redirect_cache_outbox o
    where (o.status in ('PENDING','FAILED') and o.available_at <= now()) or (o.status = 'PROCESSING' and o.lease_until < now())
    order by o.created_at for update skip locked limit least(greatest(p_limit, 1), 500)
  ) update public.redirect_cache_outbox o set status = 'PROCESSING', lease_until = now() + make_interval(secs => p_lease_seconds), attempts = attempts + 1
    from claimed where o.id = claimed.id returning o.id, o.slug, o.route_version;
end $$;

create or replace function public.complete_redirect_cache_event(p_event_id uuid, p_slug text, p_version bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.qr_routes set cache_version = greatest(cache_version, p_version), cache_synced_at = now(), cache_error = null where slug = p_slug and version >= p_version;
  update public.redirect_cache_outbox set status = 'DONE', lease_until = null, completed_at = now(), last_error = null where id = p_event_id;
end $$;

create or replace function public.fail_redirect_cache_event(p_event_id uuid, p_error text, p_retryable boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare target record;
begin
  update public.redirect_cache_outbox set status = 'FAILED',
    lease_until = null, last_error = left(p_error, 1000), available_at = case when p_retryable then now() + make_interval(secs => least(3600, power(2, least(attempts, 10))::integer)) else 'infinity'::timestamptz end
    where id = p_event_id returning slug, route_version into target;
  update public.qr_routes set cache_error = left(p_error, 1000) where slug = target.slug and version = target.route_version;
end $$;

create or replace function public.enqueue_redirect_cache_reconciliation(p_limit integer default 500)
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted integer;
begin
  insert into public.redirect_cache_outbox(slug, route_version)
    select slug, version from public.qr_routes where cache_version < version order by updated_at limit least(greatest(p_limit, 1), 5000)
    on conflict (slug, route_version) do update set status = 'PENDING', available_at = now(), lease_until = null;
  get diagnostics inserted = row_count; return inserted;
end $$;

revoke all on function public.claim_redirect_cache_events(integer, integer) from public, anon, authenticated;
revoke all on function public.complete_redirect_cache_event(uuid, text, bigint) from public, anon, authenticated;
revoke all on function public.fail_redirect_cache_event(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.enqueue_redirect_cache_reconciliation(integer) from public, anon, authenticated;
grant execute on function public.claim_redirect_cache_events(integer, integer), public.complete_redirect_cache_event(uuid, text, bigint), public.fail_redirect_cache_event(uuid, text, boolean), public.enqueue_redirect_cache_reconciliation(integer) to service_role;
revoke all on function public.finalize_flyer_batch(uuid, text, text, bigint, uuid) from public, anon, authenticated;
revoke all on function public.get_flyer_batch_as(uuid, uuid) from public, anon, authenticated;
grant execute on function public.finalize_flyer_batch(uuid, text, text, bigint, uuid) to service_role;
revoke all on function public.reserve_template(uuid, uuid, text, text, bigint, text, integer, numeric, numeric, jsonb), public.finalize_template(uuid), public.reserve_flyer_batch(uuid, uuid, uuid, integer, text), public.get_flyer_batch(uuid), public.activate_flyer(uuid, text, uuid, text, double precision, double precision) from public, anon;
grant execute on function public.reserve_template(uuid, uuid, text, text, bigint, text, integer, numeric, numeric, jsonb), public.finalize_template(uuid), public.reserve_flyer_batch(uuid, uuid, uuid, integer, text), public.get_flyer_batch(uuid), public.activate_flyer(uuid, text, uuid, text, double precision, double precision) to authenticated;
