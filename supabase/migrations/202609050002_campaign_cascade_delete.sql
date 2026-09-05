-- The original command was deployed as a guarded empty-campaign delete.
-- Replace it with the explicitly confirmed archive-then-cascade behavior.
drop function if exists public.delete_empty_campaign(uuid, uuid);
create or replace function public.delete_empty_campaign(p_workspace_id uuid, p_campaign_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare template_paths jsonb; batch_paths jsonb;
begin
  if not public.is_workspace_owner(p_workspace_id) then raise exception 'workspace access denied'; end if;
  if not exists (select 1 from public.campaigns where id = p_campaign_id and workspace_id = p_workspace_id and status = 'ARCHIVED') then raise exception 'campaign must be archived before deletion'; end if;
  select coalesce(jsonb_agg(storage_path), '[]'::jsonb) into template_paths from public.templates where campaign_id = p_campaign_id;
  select coalesce(jsonb_agg(storage_path), '[]'::jsonb) into batch_paths from public.flyer_batches where campaign_id = p_campaign_id;
  update public.locations set campaign_id = null where campaign_id = p_campaign_id and workspace_id = p_workspace_id;
  delete from public.activations where flyer_id in (select id from public.flyers where campaign_id = p_campaign_id);
  delete from public.qr_routes where campaign_id = p_campaign_id;
  delete from public.flyers where campaign_id = p_campaign_id;
  delete from public.flyer_batches where campaign_id = p_campaign_id;
  delete from public.template_qr_placements where template_id in (select id from public.templates where campaign_id = p_campaign_id);
  delete from public.templates where campaign_id = p_campaign_id;
  delete from public.campaigns where id = p_campaign_id and workspace_id = p_workspace_id;
  return jsonb_build_object('templatePaths', template_paths, 'batchPaths', batch_paths);
end $$;
