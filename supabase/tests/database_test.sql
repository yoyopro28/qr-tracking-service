begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

select has_table('public', 'qr_routes', 'qr_routes exists');
select has_table('public', 'redirect_cache_outbox', 'outbox exists');
select has_table('public', 'scan_workspace_rollups_daily', 'workspace analytics rollups exist');
select has_function('public', 'reserve_flyer_batch', array['uuid','uuid','uuid','integer','text'], 'batch reservation RPC exists');
select has_function('public', 'archive_template', array['uuid','uuid'], 'template archive RPC exists');
select has_function('public', 'retire_flyer', array['uuid','uuid'], 'flyer retirement RPC exists');
select has_function('public', 'delete_unused_location', array['uuid','uuid'], 'safe location delete RPC exists');
select has_function('public', 'configure_runtime_integrations', array['text','text','text','text','text','text'], 'runtime integration setup RPC exists');
select has_function('public', 'get_scan_rollup_summary', array['uuid','date','date'], 'long-term analytics reader RPC exists');
select has_function('public', 'get_campaign_flyer_batches', array['uuid','uuid'], 'batch summary reader RPC exists');
select ok(not has_function_privilege('authenticated', 'public.configure_runtime_integrations(text,text,text,text,text,text)', 'EXECUTE'), 'browser role cannot configure runtime integrations');

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'one@example.test', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'two@example.test', '', now(), now(), now());

create temporary table test_workspace_ids as
select user_id, workspace_id from public.workspace_members
where user_id in ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
grant select on test_workspace_ids to authenticated;

insert into public.campaigns(id, workspace_id, name, destination_url, status)
select '30000000-0000-0000-0000-000000000003', workspace_id, 'Owner one', 'https://example.com/one', 'ACTIVE'
from public.workspace_members where user_id = '10000000-0000-0000-0000-000000000001';
insert into public.campaigns(id, workspace_id, name, destination_url, status)
select '40000000-0000-0000-0000-000000000004', workspace_id, 'Owner two', 'https://example.com/two', 'ACTIVE'
from public.workspace_members where user_id = '20000000-0000-0000-0000-000000000002';

set local role anon;
select is((select count(*) from public.campaigns), 0::bigint, 'anon cannot read campaigns');
select is((select count(*) from public.workspaces), 0::bigint, 'anon cannot read workspaces');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.campaigns), 1::bigint, 'member sees one tenant campaign');
select is((select name from public.campaigns), 'Owner one', 'member cannot see another tenant campaign');
select ok(public.can_access_storage_object((select workspace_id from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001') || '/campaign/template.pdf'), 'member can access own workspace storage prefix');
select ok(not public.can_access_storage_object((select workspace_id from test_workspace_ids where user_id = '20000000-0000-0000-0000-000000000002') || '/campaign/template.pdf'), 'member cannot access another workspace storage prefix');
select throws_ok(
  $$insert into public.campaigns(workspace_id, name, destination_url) select workspace_id, 'Injected', 'https://example.com' from test_workspace_ids where user_id = '20000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'member cannot inject another workspace id'
);
reset role;

insert into public.templates(id, workspace_id, campaign_id, storage_path, original_filename, mime_type, file_size_bytes, sha256, page_count, width, height, status)
select '50000000-0000-0000-0000-000000000005', workspace_id, '30000000-0000-0000-0000-000000000003', workspace_id || '/30000000-0000-0000-0000-000000000003/50000000-0000-0000-0000-000000000005/template.pdf', 'template.pdf', 'application/pdf', 10, repeat('a', 64), 1, 595, 842, 'READY'
from public.workspace_members where user_id = '10000000-0000-0000-0000-000000000001';
insert into public.template_qr_placements(template_id, page_number, placement_order, x, y, width, height) values('50000000-0000-0000-0000-000000000005', 1, 0, 10, 10, 100, 100);
insert into public.flyer_batches(id, workspace_id, campaign_id, template_id, sheet_count, physical_flyer_count, storage_path, tracking_origin, status)
select '60000000-0000-0000-0000-000000000006', workspace_id, '30000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000005', 1, 1, workspace_id || '/30000000-0000-0000-0000-000000000003/60000000-0000-0000-0000-000000000006/flyer-batch.pdf', 'https://q.example', 'FINALIZED'
from public.workspace_members where user_id = '10000000-0000-0000-0000-000000000001';
insert into public.flyers(id, workspace_id, campaign_id, template_id, batch_id, shortcode, tracking_url, sheet_index, placement_index, status)
select '70000000-0000-0000-0000-000000000007', workspace_id, '30000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000006', 'AB12CD34', 'https://q.example/r/AB12CD34', 0, 0, 'GENERATED'
from public.workspace_members where user_id = '10000000-0000-0000-0000-000000000001';

select is((select status::text from public.qr_routes where slug = 'AB12CD34'), 'ACTIVE', 'finalized active flyer projects an active route');
select is((select count(*) from public.redirect_cache_outbox where slug = 'AB12CD34'), 1::bigint, 'route projection creates an outbox event');
select ok(not has_function_privilege('authenticated', 'public.finalize_flyer_batch(uuid,text,text,bigint,uuid)', 'EXECUTE'), 'browser role cannot call privileged finalization RPC');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
update public.flyers set status = 'RETIRED' where id = '70000000-0000-0000-0000-000000000007';
select is((select status::text from public.flyers where id = '70000000-0000-0000-0000-000000000007'), 'GENERATED', 'browser cannot bypass flyer command RPCs with a direct write');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.retire_flyer((select workspace_id from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001'), '70000000-0000-0000-0000-000000000007')$$,
  'P0001', 'workspace access denied', 'another tenant cannot retire a flyer'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select public.retire_flyer((select workspace_id from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001'), '70000000-0000-0000-0000-000000000007');
select is((select status::text from public.flyers where id = '70000000-0000-0000-0000-000000000007'), 'RETIRED', 'owner can retire a flyer through the command RPC');
select is((select status::text from public.qr_routes where slug = 'AB12CD34'), 'DISABLED', 'retired flyer creates a tombstone');
select is(jsonb_array_length(public.get_campaign_flyer_batches((select workspace_id from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001'), '30000000-0000-0000-0000-000000000003')), 1, 'member loads the campaign batch history in one RPC');
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.get_campaign_flyer_batches((select workspace_id from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001'), '30000000-0000-0000-0000-000000000003')$$,
  'P0001', 'workspace access denied', 'another tenant cannot read batch summaries'
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select public.archive_template((select workspace_id from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001'), '50000000-0000-0000-0000-000000000005');
select is((select status::text from public.templates where id = '50000000-0000-0000-0000-000000000005'), 'ARCHIVED', 'owner can archive a ready template');
reset role;

insert into public.locations(id, workspace_id, name)
select '80000000-0000-0000-0000-000000000008', workspace_id, 'Unused location'
from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select public.delete_unused_location((select workspace_id from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001'), '80000000-0000-0000-0000-000000000008');
select is((select count(*) from public.locations where id = '80000000-0000-0000-0000-000000000008'), 0::bigint, 'owner can delete an unused location');
reset role;

insert into public.scan_rollups_daily(day, workspace_id, campaign_id, flyer_id, location_id, country_code, scans, unique_ip_days)
select current_date - 10, workspace_id, '30000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000007', null, 'DE', 7, 3
from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001';
insert into public.scan_workspace_rollups_daily(day, workspace_id, scans, unique_ip_days)
select current_date - 10, workspace_id, 7, 3
from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001';
set local role anon;
select is((select count(*) from public.scan_workspace_rollups_daily), 0::bigint, 'anon cannot read workspace analytics rollups');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is(
  (public.get_scan_rollup_summary((select workspace_id from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001'), current_date - 20, current_date - 1)->>'totalScans')::bigint,
  7::bigint,
  'member can read the own long-term rollup summary'
);
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.get_scan_rollup_summary((select workspace_id from test_workspace_ids where user_id = '10000000-0000-0000-0000-000000000001'), current_date - 20, current_date - 1)$$,
  'P0001', 'workspace access denied', 'another tenant cannot read rollup analytics'
);
reset role;

set local role service_role;
select lives_ok(
  $$select public.configure_runtime_integrations(
    'https://project-ref.supabase.co',
    'sb_publishable_12345678901234567890',
    'https://cache-sync.example.workers.dev',
    repeat('s', 64), repeat('r', 64), repeat('m', 64)
  )$$,
  'service role can configure runtime integrations'
);
reset role;
select is((select count(*) from cron.job where jobname like 'qr-%-daily'), 2::bigint, 'runtime setup installs both daily jobs');
select is((select count(*) from vault.secrets where name like 'qr_%'), 6::bigint, 'runtime setup stores six encrypted integration values');

select * from finish();
rollback;
