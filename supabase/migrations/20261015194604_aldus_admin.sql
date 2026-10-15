-- Aldus Admin 1.5. Additive; requires SaaS 1 + active-account Library fences.
begin;
create schema aldus_admin_private;
revoke all on schema aldus_admin_private from public,anon,authenticated;
create table public.aldus_admin_members (
 user_id uuid primary key references public.profiles(id),
 role text not null check(role in ('OWNER','ADMIN')),
 permissions text[] not null default '{}', active boolean not null default true,
 updated_at timestamptz not null default now()
);
create table public.aldus_admin_audit (
 id bigint generated always as identity primary key, actor uuid, resource text not null,
 action text not null, occurred_at timestamptz not null default now(),
 outcome text not null check(outcome in ('success','denied')), reason text,
 changes jsonb not null default '{}', request_id uuid
);
create index aldus_admin_audit_actor_date on public.aldus_admin_audit(actor,occurred_at);
create table aldus_admin_private.receipts (
 actor uuid not null, request_id uuid not null, request jsonb not null, response jsonb not null,
 primary key(actor,request_id)
);
create table aldus_admin_private.revisions (resource text primary key, revision bigint not null);
alter table public.saas_plans add column commercial_description text not null default '';
alter table public.saas_plans add column annual_brl_centavos integer check(annual_brl_centavos>=0);
create table public.aldus_plan_proposals (
 id uuid primary key, proposed_by uuid not null, proposal jsonb not null,
 created_at timestamptz not null default now(), status text not null default 'proposed' check(status='proposed')
);
create table public.aldus_price_history (
 id bigint generated always as identity primary key, plan_id text not null references public.saas_plans(id),
 monthly_brl_centavos integer check(monthly_brl_centavos>=0), annual_brl_centavos integer check(annual_brl_centavos>=0),
 effective_from timestamptz not null default now(), actor uuid, charged_price_source text not null default 'not_integrated'
);
insert into public.aldus_price_history(plan_id,monthly_brl_centavos,annual_brl_centavos)
select id,price_brl_centavos,annual_brl_centavos from public.saas_plans;
create table public.aldus_system_settings (
 key text primary key, value jsonb not null, requires_deploy boolean not null,
 revision bigint not null default 0, updated_at timestamptz not null default now()
);
create table public.aldus_setting_history (
 id bigint generated always as identity primary key, key text not null, value jsonb not null,
 revision bigint not null, actor uuid, created_at timestamptz not null default now(), unique(key,revision)
);
insert into public.aldus_system_settings(key,value,requires_deploy) values
 ('app.notice','""',false),('app.public_name','"Aldus Reader"',true),
 ('app.institutional_url','""',true),('app.policy_notice','""',true),
 ('operation.maintenance_notice','""',true),('operation.supported_version','""',true),
 ('features.community_enabled','true',true),('features.battle_enabled','true',true),
 ('features.premium_enabled','false',true),('features.experimental_enabled','false',true);
insert into public.aldus_setting_history(key,value,revision) select key,value,revision from public.aldus_system_settings;

-- No direct administrative table access, even for a user with an OWNER membership.
do $$ declare t text; begin
 foreach t in array array['aldus_admin_members','aldus_admin_audit','aldus_plan_proposals','aldus_price_history','aldus_system_settings','aldus_setting_history'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
alter table aldus_admin_private.receipts enable row level security;
alter table aldus_admin_private.revisions enable row level security;
revoke all on all tables in schema aldus_admin_private from public,anon,authenticated;
revoke all on sequence public.aldus_admin_audit_id_seq,public.aldus_price_history_id_seq,public.aldus_setting_history_id_seq from public,anon,authenticated;

create function aldus_admin_private.immutable_history() returns trigger
language plpgsql set search_path='' as $$ begin raise exception 'immutable administrative history' using errcode='42501'; end $$;
create trigger aldus_immutable_audit before update or delete on public.aldus_admin_audit for each row execute function aldus_admin_private.immutable_history();
create trigger aldus_immutable_prices before update or delete on public.aldus_price_history for each row execute function aldus_admin_private.immutable_history();
create trigger aldus_immutable_settings before update or delete on public.aldus_setting_history for each row execute function aldus_admin_private.immutable_history();

create function aldus_admin_private.allowed(p_permission text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.aldus_admin_members m
 join public.profiles p on p.id=m.user_id join auth.users u on u.id=p.id
 where m.user_id=auth.uid() and m.active and p.account_status='active' and u.email_confirmed_at is not null
 and exists(select 1 from auth.sessions s where s.user_id=u.id and s.id::text=auth.jwt()->>'session_id' and (s.not_after is null or s.not_after>now()))
 and (p_permission='access' or m.role='OWNER' or p_permission=any(m.permissions)));
$$;
create function aldus_admin_private.recent_mfa() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal'='aal2',false)
 and exists(select 1 from auth.mfa_factors f join auth.sessions s on s.factor_id=f.id
   where f.user_id=auth.uid() and f.status='verified' and f.factor_type='totp'
   and s.user_id=auth.uid() and s.id::text=auth.jwt()->>'session_id' and s.aal='aal2')
 and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(auth.jwt()->'amr')='array' then auth.jwt()->'amr' else '[]' end) a
 where a->>'method'='totp' and case when a->>'timestamp' ~ '^[0-9]{1,12}$'
 then to_timestamp((a->>'timestamp')::double precision) between now()-interval '10 minutes' and now() else false end);
$$;
create function aldus_admin_private.require_permission(p_permission text) returns void
language plpgsql stable security definer set search_path='' as $$ begin
 if not aldus_admin_private.allowed(p_permission) then raise exception 'administrative access denied' using errcode='42501'; end if;
end $$;
create function aldus_admin_private.revision(p_resource text) returns bigint
language sql stable security definer set search_path='' as $$ select coalesce((select revision from aldus_admin_private.revisions where resource=p_resource),0); $$;

-- Trusted, non-public bootstrap only; no frontend email comparison or synthetic account.
create function aldus_admin_private.bootstrap_owner(p_email text,p_expected_uuid uuid) returns uuid
language plpgsql security definer set search_path='' as $$ declare found_id uuid; begin
 perform pg_advisory_xact_lock(hashtextextended('aldus_admin_changes',0));
 if exists(select 1 from public.aldus_admin_members where role='OWNER') then raise exception 'bootstrap already completed'; end if;
 select u.id into strict found_id from auth.users u join public.profiles p on p.id=u.id
 where lower(u.email)=lower(trim(p_email)) and u.id=p_expected_uuid and u.email_confirmed_at is not null and p.account_status='active';
 insert into public.aldus_admin_members(user_id,role) values(found_id,'OWNER');
 insert into public.aldus_admin_audit(actor,resource,action,outcome,reason,changes)
 values(null,found_id::text,'bootstrap_owner','success','Verified Auth UUID bootstrap',jsonb_build_object('role','OWNER'));
 return found_id;
end $$;

-- Protect the last active/verified OWNER even across trusted/manual profile writes.
create function aldus_admin_private.keep_owner() returns trigger
language plpgsql security definer set search_path='' as $$ declare target uuid; remains boolean; begin
 perform pg_advisory_xact_lock(hashtextextended('aldus_admin_changes',0));
 target:=(to_jsonb(old)->>case when tg_table_name='profiles' then 'id' else 'user_id' end)::uuid;
 if exists(select 1 from public.aldus_admin_members where user_id=target and role='OWNER' and active)
 and exists(select 1 from public.profiles where id=target and account_status='active') then
  if tg_table_name='profiles' then remains:=(tg_op='UPDATE' and new.account_status='active');
  else remains:=(tg_op='UPDATE' and new.role='OWNER' and new.active); end if;
  if not remains and not exists(select 1 from public.aldus_admin_members m join public.profiles p on p.id=m.user_id
    join auth.users u on u.id=m.user_id where m.role='OWNER' and m.active and p.account_status='active'
    and u.email_confirmed_at is not null and m.user_id<>target) then raise exception 'last active OWNER protected' using errcode='42501'; end if;
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger aldus_keep_owner_member before update or delete on public.aldus_admin_members for each row execute function aldus_admin_private.keep_owner();
create trigger aldus_keep_owner_profile before update of account_status or delete on public.profiles for each row execute function aldus_admin_private.keep_owner();

create function public.aldus_admin_session() returns jsonb
language plpgsql stable security definer set search_path='' as $$ declare member public.aldus_admin_members; begin
 perform aldus_admin_private.require_permission('access');
 select * into member from public.aldus_admin_members where user_id=auth.uid();
 return jsonb_build_object('version',1,'userId',member.user_id,'role',member.role,'permissions',member.permissions,
   'recentMfa',aldus_admin_private.recent_mfa(),'source','server_database');
end $$;

-- Only counts/metadata, never book payloads, notes, private paths or tokens.
create function aldus_admin_private.usage(p_user uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('books',(select count(*) from public.user_library_items where kind='book' and deleted_at is null and (p_user is null or user_id=p_user)),
 'storageBytes',case when count(*) filter(where metadata->>'size' is null or metadata->>'size' !~ '^[0-9]{1,15}$')>0 then null
 else coalesce(sum(case when metadata->>'size' ~ '^[0-9]{1,15}$' then (metadata->>'size')::bigint else 0 end),0) end,
 'objects',count(*),'unknownSizeObjects',count(*) filter(where metadata->>'size' is null or metadata->>'size' !~ '^[0-9]{1,15}$'))
 from storage.objects where bucket_id='aldus-private-library' and (p_user is null or split_part(name,'/',1)=p_user::text);
$$;

create function aldus_admin_private.effective_features(p_user uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.profiles where id=p_user and account_status='active') then
 coalesce((select jsonb_object_agg(feature,enabled) from (
  select pf.feature,pf.enabled from public.saas_plan_features pf where pf.plan_id=saas_private.effective_plan(p_user)
   and not exists(select 1 from public.saas_account_entitlements e where e.user_id=p_user and e.feature=pf.feature and (e.ends_at is null or e.ends_at>now()))
  union all select feature,enabled from public.saas_account_entitlements where user_id=p_user and (ends_at is null or ends_at>now())
 ) f),'{}') || '{"local_reading":true,"book_import":true,"library_sync":true,"progress_sync":true,"study_sync":true,"organization_sync":true,"private_storage":true,"basic_study":true}'::jsonb
 else '{}'::jsonb end;
$$;

create function public.aldus_admin_read(p_section text,p_filters jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; permission text; from_at timestamptz; until_at timestamptz; page_no integer; target uuid; search text;
begin
 permission:=case p_section when 'users' then 'users.read' when 'user' then 'users.read' when 'members' then 'members.manage'
 when 'plans' then 'plans.manage' when 'settings' then 'settings.manage' when 'audit' then 'audit.read' else 'metrics.read' end;
 if p_section not in ('overview','users','user','subscriptions','plans','storage','metrics','settings','members','audit','health') then raise exception 'unknown admin section' using errcode='22023'; end if;
 perform aldus_admin_private.require_permission(permission);
 from_at:=coalesce((p_filters->>'from')::timestamptz,now()-interval '30 days');
 until_at:=coalesce((p_filters->>'until')::timestamptz,now());
 if until_at<from_at or until_at-from_at>interval '366 days' then raise exception 'invalid period' using errcode='22023'; end if;
 page_no:=coalesce((p_filters->>'page')::integer,0);
 if page_no<0 or page_no>100000 then raise exception 'invalid page' using errcode='22023'; end if;
 if p_section in ('overview','metrics','subscriptions','storage','health') then
  select jsonb_build_object('registeredUsers',count(*),'newUsers',count(*) filter(where created_at between from_at and until_at),
   'recentSignIns',count(*) filter(where last_sign_in_at between from_at and until_at),'activeUsers',null,
   'freeAccounts',count(*) filter(where saas_private.effective_plan(id)='free'),
   'proAccounts',count(*) filter(where saas_private.effective_plan(id)='pro')) into result from auth.users;
  result:=result||jsonb_build_object('usage',aldus_admin_private.usage(),
   'averageStorageBytes',(aldus_admin_private.usage()->>'storageBytes')::numeric/nullif((result->>'registeredUsers')::numeric,0),
   'activeSubscriptions',(select count(*) from public.saas_account_subscriptions where status in ('active','trialing') and starts_at<=now() and (ends_at is null or ends_at>now())),
   'expiredSubscriptions',(select count(*) from public.saas_account_subscriptions where status='expired' or (status in ('active','trialing') and ends_at<=now())),
   'manualProGrants',(select count(*) from public.saas_account_subscriptions where plan_id='pro' and grant_source='trusted_backend'),
   'syncOperations',(select count(*) from public.user_library_operations where created_at between from_at and until_at),
   'syncFailures',null,'authFailures',null,'processingFailures',null,'freeToProConversion',null,
   'payments',jsonb_build_object('status','not_integrated','mrr',null,'arr',null,'totalRevenue',null,'cancellations',null,'churn',null,'transactions',null,'events',null,'refunds',null),
   'health',jsonb_build_object('database','reachable','authLogs','unavailable','syncErrors','unavailable','externalIntegrations','unavailable','deployments','unavailable'),
   'registrationsByDay',(select coalesce(jsonb_agg(d),'[]') from (select date_trunc('day',created_at)::date as day,count(*) as count from auth.users where created_at between from_at and until_at group by 1 order by 1) d),
   'from',from_at,'until',until_at,'observedAt',now());
 elsif p_section='users' then
  search:=left(coalesce(p_filters->>'search',''),150);
  select jsonb_build_object('page',page_no,'pageSize',25,'rows',coalesce(jsonb_agg(r),'[]')) into result from (
    select p.id,p.display_name,p.username,u.email,p.account_status,u.created_at,u.last_sign_in_at,
      saas_private.effective_plan(p.id) as effective_plan,aldus_admin_private.revision('user:'||p.id) as revision
    from public.profiles p join auth.users u on u.id=p.id
    where (search='' or p.display_name ilike '%'||search||'%' or p.username ilike '%'||search||'%' or u.email ilike '%'||search||'%' or p.id::text=search)
    and (coalesce(p_filters->>'plan','')='' or saas_private.effective_plan(p.id)=p_filters->>'plan')
    and (coalesce(p_filters->>'status','')='' or p.account_status=p_filters->>'status')
    and (p_filters->>'from' is null or u.created_at>=from_at) and (p_filters->>'until' is null or u.created_at<=until_at)
    order by p.id limit 25 offset page_no*25
  ) r;
 elsif p_section='user' then
  target:=(p_filters->>'id')::uuid;
  select jsonb_build_object('account',jsonb_build_object('id',p.id,'displayName',p.display_name,'username',p.username,'email',u.email,
    'emailVerified',u.email_confirmed_at is not null,'status',p.account_status,'createdAt',u.created_at,'lastSignInAt',u.last_sign_in_at),
    'subscription',(select to_jsonb(s) from public.saas_account_subscriptions s where s.user_id=p.id),
    'effectivePlan',(select to_jsonb(plan) from public.saas_plans plan where plan.id=saas_private.effective_plan(p.id)),
    'entitlements',(select coalesce(jsonb_agg(jsonb_build_object('feature',e.feature,'enabled',e.enabled,'endsAt',e.ends_at)),'[]') from public.saas_account_entitlements e where e.user_id=p.id),
    'usage',aldus_admin_private.usage(p.id),'features',aldus_admin_private.effective_features(p.id),'revision',aldus_admin_private.revision('user:'||p.id),
    'sync',jsonb_build_object('receipts',(select count(*) from public.user_library_operations where user_id=p.id),
     'lastAcceptedAt',(select max(created_at) from public.user_library_operations where user_id=p.id),'failures',null),
    'history',(select coalesce(jsonb_agg(a),'[]') from (select actor,action,occurred_at,outcome,reason from public.aldus_admin_audit where resource='user:'||p.id order by id desc limit 25) a)) into result
   from public.profiles p join auth.users u on u.id=p.id where p.id=target;
 elsif p_section='plans' then
  select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('revision',aldus_admin_private.revision('plan:'||p.id),
    'features',(select coalesce(jsonb_object_agg(feature,enabled),'{}') from public.saas_plan_features where plan_id=p.id))),'[]'),
    'priceHistory',(select coalesce(jsonb_agg(h),'[]') from (select * from public.aldus_price_history order by id desc limit 100) h),
    'proposals',(select coalesce(jsonb_agg(q),'[]') from (select * from public.aldus_plan_proposals order by created_at desc limit 50) q),
    'chargedPriceSource','not_integrated') into result from public.saas_plans p;
 elsif p_section='settings' then
  select jsonb_build_object('rows',coalesce(jsonb_agg(s order by s.key),'[]'),
    'history',(select coalesce(jsonb_agg(h),'[]') from (select * from public.aldus_setting_history order by id desc limit 100) h)) into result from public.aldus_system_settings s;
 elsif p_section='members' then
  select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('revision',aldus_admin_private.revision('member:'||m.user_id))),'[]')) into result from public.aldus_admin_members m;
 elsif p_section='audit' then
  select jsonb_build_object('page',page_no,'rows',coalesce(jsonb_agg(a),'[]')) into result from (
    select id,actor,resource,action,occurred_at,outcome,reason,changes from public.aldus_admin_audit
    where occurred_at between from_at and until_at order by id desc limit 25 offset page_no*25
  ) a;
 end if;
 return jsonb_build_object('version',1,'section',p_section,'source','server_database','data',result);
end $$;

create function aldus_admin_private.validate_setting(p_key text,p_value jsonb) returns void
language plpgsql set search_path='' as $$ begin
 if not exists(select 1 from public.aldus_system_settings where key=p_key) then raise exception 'setting not allowed' using errcode='22023'; end if;
 if p_key like 'features.%' then
  if jsonb_typeof(p_value)<>'boolean' then raise exception 'boolean setting required' using errcode='22023'; end if;
 elsif jsonb_typeof(p_value)<>'string' or length(p_value#>>'{}')>2000 then raise exception 'text setting required' using errcode='22023';
 end if;
 if p_key='app.public_name' and length(trim(p_value#>>'{}')) not between 1 and 80 then raise exception 'invalid app name' using errcode='22023'; end if;
 if p_key='app.institutional_url' and (p_value#>>'{}')<>'' and (p_value#>>'{}') !~ '^https://[^[:space:]]+$' then raise exception 'HTTPS URL required' using errcode='22023'; end if;
end $$;

create function public.aldus_admin_change(p_request_id uuid,p_action text,p_target text,p_expected_revision bigint,p_payload jsonb,p_reason text,p_confirmation text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare permission text; actor_role text; resource text; request jsonb; receipt aldus_admin_private.receipts;
 answer jsonb; target_id uuid; next_revision bigint; feature text; enabled boolean; old_plan public.saas_plans;
 setting_value jsonb; failure_code text; changes jsonb := '{}';
begin
 -- Global serialization + optimistic revision prevents lost updates and last-OWNER races.
 perform pg_advisory_xact_lock(hashtextextended('aldus_admin_changes',0));
 request:=jsonb_build_object('action',p_action,'target',p_target,'base',p_expected_revision,'payload',p_payload,'reason',p_reason);
 begin
  if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>16384
   or p_target is null or length(p_target)>150 or p_expected_revision is null or p_expected_revision<0
   or length(trim(coalesce(p_reason,''))) not between 8 and 500 then raise exception 'invalid command' using errcode='22023'; end if;
  permission:=case p_action when 'account_status' then 'users.write' when 'benefit' then 'subscriptions.manage'
   when 'entitlement' then 'subscriptions.manage' when 'member' then 'members.manage'
   when 'plan' then 'plans.manage' when 'plan_proposal' then 'plans.manage'
   when 'setting' then 'settings.manage' when 'setting_rollback' then 'settings.manage' else null end;
  if permission is null then raise exception 'unknown command' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_payload) k where not k=any(case p_action
   when 'account_status' then array['status'] when 'benefit' then array['mode','endsAt']
   when 'entitlement' then array['feature','enabled','endsAt'] when 'member' then array['role','active','permissions']
   when 'plan' then array['name','description','books','storageBytes','monthlyCentavos','annualCentavos','available','features']
   when 'plan_proposal' then array['name','description'] when 'setting' then array['value'] else array['revision'] end))
   then raise exception 'command field not allowed' using errcode='22023'; end if;
  perform aldus_admin_private.require_permission(permission);
  if not aldus_admin_private.recent_mfa() then raise exception 'recent TOTP MFA required' using errcode='42501'; end if;
  if p_confirmation is distinct from 'CONFIRMAR '||p_target then raise exception 'explicit confirmation required' using errcode='22023'; end if;
  select role into actor_role from public.aldus_admin_members where user_id=auth.uid();
  if p_action in ('member','plan','plan_proposal','setting','setting_rollback') and actor_role<>'OWNER' then raise exception 'OWNER required' using errcode='42501'; end if;
  select * into receipt from aldus_admin_private.receipts where actor=auth.uid() and request_id=p_request_id;
  if found then
   if receipt.request<>request then raise exception 'request identity reused' using errcode='22023'; end if;
   return receipt.response;
  end if;
  if (select count(*) from public.aldus_admin_audit where actor=auth.uid() and occurred_at>now()-interval '1 minute')>=60 then raise exception 'administrative rate limit' using errcode='54000'; end if;
  resource:=case when p_action in ('account_status','benefit','entitlement') then 'user:' when p_action='member' then 'member:'
   when p_action in ('plan','plan_proposal') then 'plan:' else 'setting:' end ||p_target;
  if aldus_admin_private.revision(resource)<>p_expected_revision then raise exception 'revision conflict' using errcode='40001'; end if;
  if p_action in ('account_status','benefit','entitlement','member') then
   target_id:=p_target::uuid;
   if not exists(select 1 from public.profiles where id=target_id) then raise exception 'account not found' using errcode='22023'; end if;
   if target_id=auth.uid() then raise exception 'self administrative change denied' using errcode='42501'; end if;
   if p_action<>'member' and exists(select 1 from public.aldus_admin_members where user_id=target_id and active) then
    raise exception 'admin account protected; manage membership separately' using errcode='42501'; end if;
  end if;
  if p_action='account_status' then
   if p_payload->>'status' is null or p_payload->>'status' not in ('active','disabled') then raise exception 'invalid status' using errcode='22023'; end if;
   update public.profiles set account_status=p_payload->>'status' where id=target_id;
   changes:=jsonb_build_object('status',p_payload->>'status');
  elsif p_action='benefit' then
   if not exists(select 1 from public.profiles where id=target_id and account_status='active') then raise exception 'active target required' using errcode='42501'; end if;
   if p_payload->>'mode'='grant' then
    if (p_payload->>'endsAt')::timestamptz is null or (p_payload->>'endsAt')::timestamptz<=now() then raise exception 'future expiry required' using errcode='22023'; end if;
    insert into public.saas_account_subscriptions(user_id,plan_id,status,starts_at,ends_at,grant_source)
    values(target_id,'pro','active',now(),(p_payload->>'endsAt')::timestamptz,'trusted_backend')
    on conflict(user_id) do update set plan_id='pro',status='active',starts_at=now(),ends_at=excluded.ends_at,grant_source='trusted_backend';
   elsif p_payload->>'mode'='revoke' then
    update public.saas_account_subscriptions set status='revoked' where user_id=target_id;
   else raise exception 'invalid benefit mode' using errcode='22023'; end if;
   changes:=jsonb_build_object('mode',p_payload->>'mode','endsAt',p_payload->>'endsAt','commercialSale',false);
  elsif p_action='entitlement' then
   feature:=p_payload->>'feature';
   if feature is null or feature !~ '^premium_[a-z0-9_]{1,55}$' or jsonb_typeof(p_payload->'enabled')<>'boolean' then raise exception 'premium feature required' using errcode='22023'; end if;
   if (p_payload->>'endsAt')::timestamptz is null or (p_payload->>'endsAt')::timestamptz<=now() then raise exception 'future expiry required' using errcode='22023'; end if;
   insert into public.saas_account_entitlements(user_id,feature,enabled,ends_at) values(target_id,feature,(p_payload->>'enabled')::boolean,(p_payload->>'endsAt')::timestamptz)
   on conflict on constraint saas_account_entitlements_pkey do update set enabled=excluded.enabled,ends_at=excluded.ends_at;
   changes:=jsonb_build_object('feature',feature,'enabled',p_payload->'enabled');
  elsif p_action='member' then
   if p_payload->>'role' is null or p_payload->>'role' not in ('OWNER','ADMIN') or jsonb_typeof(p_payload->'active')<>'boolean'
    or jsonb_typeof(p_payload->'permissions')<>'array' then raise exception 'invalid membership' using errcode='22023'; end if;
   if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=target_id and u.email_confirmed_at is not null and p.account_status='active') then raise exception 'verified active target required' using errcode='42501'; end if;
   if exists(select 1 from jsonb_array_elements_text(p_payload->'permissions') x where x not in ('users.read','users.write','subscriptions.manage','metrics.read','audit.read')) then raise exception 'permission not delegable' using errcode='22023'; end if;
   insert into public.aldus_admin_members(user_id,role,active,permissions) values(target_id,p_payload->>'role',(p_payload->>'active')::boolean,array(select jsonb_array_elements_text(p_payload->'permissions')))
   on conflict(user_id) do update set role=excluded.role,active=excluded.active,permissions=excluded.permissions,updated_at=now();
   changes:=jsonb_build_object('role',p_payload->>'role','active',p_payload->'active','permissions',p_payload->'permissions');
  elsif p_action='plan_proposal' then
   if p_target !~ '^[a-z][a-z0-9_]{1,63}$' or length(coalesce(p_payload->>'name','')) not between 1 and 80 then raise exception 'invalid proposal' using errcode='22023'; end if;
   insert into public.aldus_plan_proposals(id,proposed_by,proposal) values(p_request_id,auth.uid(),jsonb_build_object('id',p_target,'name',p_payload->>'name','description',left(coalesce(p_payload->>'description',''),2000)));
   changes:=jsonb_build_object('proposal',p_request_id,'activated',false);
  elsif p_action='plan' then
   select * into strict old_plan from public.saas_plans where id=p_target;
   if length(trim(coalesce(p_payload->>'name',''))) not between 1 and 80 or length(coalesce(p_payload->>'description',''))>2000
    or coalesce(p_payload->>'books','') !~ '^[0-9]{1,9}$' or (p_payload->>'books')::bigint<1
    or coalesce(p_payload->>'storageBytes','') !~ '^[0-9]{1,15}$' or (p_payload->>'storageBytes')::bigint<1
    or jsonb_typeof(p_payload->'available')<>'boolean' or jsonb_typeof(p_payload->'features')<>'object'
    then raise exception 'invalid plan' using errcode='22023'; end if;
   if (p_payload->>'monthlyCentavos') is not null and (p_payload->>'monthlyCentavos') !~ '^[0-9]{1,9}$'
    or (p_payload->>'annualCentavos') is not null and (p_payload->>'annualCentavos') !~ '^[0-9]{1,9}$' then raise exception 'invalid price' using errcode='22023'; end if;
   if p_target='free' and (p_payload->>'monthlyCentavos' is distinct from '0' or p_payload->>'annualCentavos' is distinct from '0' or p_payload->>'available'<>'true') then raise exception 'Free must remain free and available' using errcode='22023'; end if;
   for feature,enabled in select key,case when jsonb_typeof(value)='boolean' then (value#>>'{}')::boolean else null end from jsonb_each(p_payload->'features') loop
    if feature !~ '^premium_[a-z0-9_]{1,55}$' or enabled is null then raise exception 'only premium features configurable' using errcode='22023'; end if;
   end loop;
   update public.saas_plans set name=p_payload->>'name',commercial_description=coalesce(p_payload->>'description',''),
    price_brl_centavos=(p_payload->>'monthlyCentavos')::integer,annual_brl_centavos=(p_payload->>'annualCentavos')::integer,
    synced_books=(p_payload->>'books')::bigint,storage_bytes=(p_payload->>'storageBytes')::bigint,available=(p_payload->>'available')::boolean where id=p_target;
   delete from public.saas_plan_features fp where fp.plan_id=p_target and fp.feature like 'premium\_%' escape '\';
   insert into public.saas_plan_features(plan_id,feature,enabled) select p_target,key,(value#>>'{}')::boolean from jsonb_each(p_payload->'features');
   insert into public.aldus_price_history(plan_id,monthly_brl_centavos,annual_brl_centavos,actor) values(p_target,(p_payload->>'monthlyCentavos')::integer,(p_payload->>'annualCentavos')::integer,auth.uid());
   changes:=jsonb_build_object('books',p_payload->'books','storageBytes',p_payload->'storageBytes','monthlyCentavos',p_payload->'monthlyCentavos','annualCentavos',p_payload->'annualCentavos','billed',false);
  elsif p_action in ('setting','setting_rollback') then
   if p_action='setting_rollback' then
    select value into strict setting_value from public.aldus_setting_history where key=p_target and revision=(p_payload->>'revision')::bigint;
   else setting_value:=p_payload->'value'; end if;
   if setting_value is null then raise exception 'setting value required' using errcode='22023'; end if;
   perform aldus_admin_private.validate_setting(p_target,setting_value);
   update public.aldus_system_settings set value=setting_value,revision=revision+1,updated_at=now() where key=p_target;
   insert into public.aldus_setting_history(key,value,revision,actor) select key,value,revision,auth.uid() from public.aldus_system_settings where key=p_target;
   changes:=jsonb_build_object('key',p_target,'rollback',p_action='setting_rollback');
  end if;
  insert into aldus_admin_private.revisions(resource,revision) values(resource,1) on conflict on constraint revisions_pkey do update set revision=aldus_admin_private.revisions.revision+1 returning revision into next_revision;
  answer:=jsonb_build_object('ok',true,'revision',next_revision);
 exception when others then
  failure_code:=case when sqlstate='40001' then 'conflict' when sqlstate='42501' then 'forbidden_or_mfa' when sqlstate='54000' then 'rate_limit' else 'invalid' end;
  answer:=jsonb_build_object('ok',false,'code',failure_code);
 end;
 -- Denials are returned (not rethrown), preserving audit outside rolled-back mutation.
 insert into public.aldus_admin_audit(actor,resource,action,outcome,reason,changes,request_id)
 values(auth.uid(),coalesce(resource,'denied'),left(coalesce(p_action,'invalid'),50),case when answer->>'ok'='true' then 'success' else 'denied' end,
  case when aldus_admin_private.allowed('access') then left(p_reason,500) else null end,case when answer->>'ok'='true' then changes else jsonb_build_object('code',answer->>'code') end,p_request_id);
 if answer->>'ok'='true' then insert into aldus_admin_private.receipts values(auth.uid(),p_request_id,request,answer); end if;
 return answer;
end $$;

create function public.aldus_app_notice() returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not public.library_account_active() then raise exception 'active account required' using errcode='42501'; end if;
 return (select value from public.aldus_system_settings where key='app.notice');
end $$;
revoke all on all functions in schema aldus_admin_private from public,anon,authenticated;
revoke all on function public.aldus_admin_session(),public.aldus_admin_read(text,jsonb),public.aldus_admin_change(uuid,text,text,bigint,jsonb,text,text),public.aldus_app_notice() from public,anon,authenticated;
grant execute on function public.aldus_admin_session(),public.aldus_admin_read(text,jsonb),public.aldus_admin_change(uuid,text,text,bigint,jsonb,text,text),public.aldus_app_notice() to authenticated;
notify pgrst,'reload schema';
commit;
