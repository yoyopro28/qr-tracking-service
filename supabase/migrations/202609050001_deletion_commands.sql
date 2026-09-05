create or replace function public.delete_empty_campaign(p_workspace_id uuid, p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_owner(p_workspace_id) then
    raise exception 'workspace access denied';
  end if;
  if not exists (select 1 from public.campaigns where id = p_campaign_id and workspace_id = p_workspace_id and status = 'ARCHIVED') then
    raise exception 'campaign must be archived before deletion';
  end if;
  if exists (select 1 from public.templates where campaign_id = p_campaign_id)
     or exists (select 1 from public.flyer_batches where campaign_id = p_campaign_id)
     or exists (select 1 from public.flyers where campaign_id = p_campaign_id) then
    raise exception 'campaign contains print material; archive it instead';
  end if;
  update public.locations set campaign_id = null where campaign_id = p_campaign_id and workspace_id = p_workspace_id;
  delete from public.campaigns where id = p_campaign_id and workspace_id = p_workspace_id;
end
$$;

revoke all on function public.delete_empty_campaign(uuid, uuid) from public, anon;
grant execute on function public.delete_empty_campaign(uuid, uuid) to authenticated;
