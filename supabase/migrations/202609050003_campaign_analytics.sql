create or replace function public.get_campaign_scan_rollup_summary(p_workspace_id uuid, p_campaign_id uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_workspace_member(p_workspace_id) then raise exception 'workspace access denied'; end if;
  if not exists (select 1 from public.campaigns where id = p_campaign_id and workspace_id = p_workspace_id) then raise exception 'campaign not found'; end if;
  if p_to <= p_from or p_to - p_from > 3660 then raise exception 'invalid rollup date range'; end if;
  return (select jsonb_build_object(
    'totalScans', coalesce(sum(scans), 0),
    'uniqueIpDays', coalesce(sum(unique_ip_days), 0),
    'series', coalesce((select jsonb_agg(jsonb_build_object('date', d.day, 'scans', d.scans) order by d.day) from (select day, sum(scans) scans from public.scan_rollups_daily where workspace_id = p_workspace_id and campaign_id = p_campaign_id and day >= p_from and day < p_to group by day) d), '[]'::jsonb),
    'campaigns', jsonb_build_array(jsonb_build_object('campaignId', p_campaign_id, 'scans', coalesce(sum(scans), 0))),
    'locations', coalesce((select jsonb_agg(jsonb_build_object('locationId', d.location_id, 'scans', d.scans) order by d.scans desc) from (select location_id, sum(scans) scans from public.scan_rollups_daily where workspace_id = p_workspace_id and campaign_id = p_campaign_id and day >= p_from and day < p_to group by location_id) d), '[]'::jsonb)
  ) from public.scan_rollups_daily where workspace_id = p_workspace_id and campaign_id = p_campaign_id and day >= p_from and day < p_to);
end $$;
revoke all on function public.get_campaign_scan_rollup_summary(uuid, uuid, date, date) from public, anon;
grant execute on function public.get_campaign_scan_rollup_summary(uuid, uuid, date, date) to authenticated;
