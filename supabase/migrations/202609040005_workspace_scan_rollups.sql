create table public.scan_workspace_rollups_daily (
  day date not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  scans bigint not null check (scans >= 0),
  unique_ip_days bigint not null check (unique_ip_days >= 0),
  updated_at timestamptz not null default now(),
  primary key (day, workspace_id)
);

alter table public.scan_workspace_rollups_daily enable row level security;
create policy workspace_rollups_member_read on public.scan_workspace_rollups_daily
for select to authenticated using (public.is_workspace_member(workspace_id));

create trigger touch_scan_workspace_rollups
before update on public.scan_workspace_rollups_daily
for each row execute function public.touch_updated_at();

create or replace function public.get_scan_rollup_summary(p_workspace_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'workspace access denied';
  end if;
  if p_to <= p_from or p_to - p_from > 3660 then
    raise exception 'invalid rollup date range';
  end if;

  with dimensions as (
    select campaign_id, location_id, scans
    from public.scan_rollups_daily
    where workspace_id = p_workspace_id and day >= p_from and day < p_to
  ), workspace_days as (
    select day, scans, unique_ip_days
    from public.scan_workspace_rollups_daily
    where workspace_id = p_workspace_id and day >= p_from and day < p_to
  )
  select jsonb_build_object(
    'totalScans', coalesce((select sum(scans) from workspace_days), 0),
    'uniqueIpDays', coalesce((select sum(unique_ip_days) from workspace_days), 0),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object('date', day, 'scans', scans) order by day)
      from workspace_days
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(jsonb_build_object('campaignId', ranked.campaign_id, 'scans', ranked.scans) order by ranked.scans desc)
      from (select campaign_id, sum(scans) scans from dimensions group by campaign_id order by scans desc limit 100) ranked
    ), '[]'::jsonb),
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object('locationId', ranked.location_id, 'scans', ranked.scans) order by ranked.scans desc)
      from (select location_id, sum(scans) scans from dimensions group by location_id order by scans desc limit 100) ranked
    ), '[]'::jsonb)
  ) into result;

  return result;
end
$$;
