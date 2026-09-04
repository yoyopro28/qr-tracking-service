create or replace function public.get_campaign_flyer_batches(p_workspace_id uuid, p_campaign_id uuid)
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', batch.id,
    'workspaceId', batch.workspace_id,
    'campaignId', batch.campaign_id,
    'templateId', batch.template_id,
    'sheetCount', batch.sheet_count,
    'physicalFlyerCount', batch.physical_flyer_count,
    'storagePath', batch.storage_path,
    'fileSizeBytes', batch.file_size_bytes,
    'sha256', batch.sha256,
    'trackingOrigin', batch.tracking_origin,
    'status', batch.status,
    'createdAt', batch.created_at,
    'finalizedAt', batch.finalized_at,
    'cacheStatus', batch.cache_status
  ) order by batch.created_at desc), '[]'::jsonb)
  into result
  from (
    select b.*,
      case
        when exists(
          select 1 from public.qr_routes r
          where r.flyer_id in (select id from public.flyers where batch_id = b.id)
            and r.cache_error is not null
        ) then 'ERROR'
        when b.status = 'FINALIZED'
          and not exists(
            select 1 from public.qr_routes r
            where r.flyer_id in (select id from public.flyers where batch_id = b.id)
              and r.cache_version < r.version
          )
          and (select count(*) from public.qr_routes r where r.flyer_id in (select id from public.flyers where batch_id = b.id)) = b.physical_flyer_count
          then 'SYNCED'
        when b.status = 'FINALIZED' then 'WRITE_ACCEPTED'
        else 'PENDING'
      end cache_status
    from public.flyer_batches b
    where b.workspace_id = p_workspace_id and b.campaign_id = p_campaign_id
  ) batch;

  return result;
end
$$;

revoke all on function public.get_campaign_flyer_batches(uuid, uuid) from public, anon;
grant execute on function public.get_campaign_flyer_batches(uuid, uuid) to authenticated;
