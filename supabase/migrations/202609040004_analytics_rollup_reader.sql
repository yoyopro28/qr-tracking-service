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

  with scoped as (
    select day, campaign_id, location_id, scans, unique_ip_days
    from public.scan_rollups_daily
    where workspace_id = p_workspace_id and day >= p_from and day < p_to
  )
  select jsonb_build_object(
    'totalScans', coalesce((select sum(scans) from scoped), 0),
    'uniqueIpDays', coalesce((select sum(unique_ip_days) from scoped), 0),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object('date', daily.day, 'scans', daily.scans) order by daily.day)
      from (select day, sum(scans) scans from scoped group by day) daily
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(jsonb_build_object('campaignId', ranked.campaign_id, 'scans', ranked.scans) order by ranked.scans desc)
      from (select campaign_id, sum(scans) scans from scoped group by campaign_id order by scans desc limit 100) ranked
    ), '[]'::jsonb),
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object('locationId', ranked.location_id, 'scans', ranked.scans) order by ranked.scans desc)
      from (select location_id, sum(scans) scans from scoped group by location_id order by scans desc limit 100) ranked
    ), '[]'::jsonb)
  ) into result;

  return result;
end
$$;

revoke all on function public.get_scan_rollup_summary(uuid, date, date) from public, anon;
grant execute on function public.get_scan_rollup_summary(uuid, date, date) to authenticated;
