begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles
    where user_id = (select auth.uid())
      and role in ('admin_staff', 'admin_of_admins')
  );
$$;

create or replace function private.is_chat_participant(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chat_participants
    where conversation_id = target_conversation_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_assignment_participant(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignment_participants
    where assignment_id = target_assignment_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_chat_participant(uuid) from public;
revoke all on function private.is_assignment_participant(uuid) from public;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.is_chat_participant(uuid) to authenticated, service_role;
grant execute on function private.is_assignment_participant(uuid) to authenticated, service_role;

create index if not exists idx_assignment_participants_user_id
on public.assignment_participants (user_id, assignment_id);

-- These tables are exposed through the Data API. Browser clients only need
-- membership-bound reads; all writes continue through authenticated API routes.
alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.freed_assignments_log enable row level security;
alter table public.anmeldestatus_entries enable row level security;

revoke all privileges on table public.chat_conversations from anon, authenticated;
revoke all privileges on table public.chat_participants from anon, authenticated;
revoke all privileges on table public.chat_messages from anon, authenticated;
revoke all privileges on table public.freed_assignments_log from anon, authenticated;
revoke all privileges on table public.anmeldestatus_entries from anon, authenticated;
grant select on table public.chat_conversations to authenticated;
grant select on table public.chat_participants to authenticated;
grant select on table public.chat_messages to authenticated;
grant select on table public.freed_assignments_log to authenticated;
grant select on table public.anmeldestatus_entries to authenticated;
grant all privileges on table public.chat_conversations to service_role;
grant all privileges on table public.chat_participants to service_role;
grant all privileges on table public.chat_messages to service_role;
grant all privileges on table public.freed_assignments_log to service_role;
grant all privileges on table public.anmeldestatus_entries to service_role;

drop policy if exists "Admins can delete any message" on public.chat_messages;

drop policy if exists chat_conversations_member_select on public.chat_conversations;
create policy chat_conversations_member_select
on public.chat_conversations
for select
to authenticated
using ((select private.is_admin()) or private.is_chat_participant(id));

drop policy if exists chat_participants_member_select on public.chat_participants;
create policy chat_participants_member_select
on public.chat_participants
for select
to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()) or private.is_chat_participant(conversation_id));

drop policy if exists chat_participants_self_update on public.chat_participants;

drop policy if exists chat_messages_member_select on public.chat_messages;
create policy chat_messages_member_select
on public.chat_messages
for select
to authenticated
using ((select private.is_admin()) or private.is_chat_participant(conversation_id));

drop policy if exists freed_assignments_self_or_admin_select on public.freed_assignments_log;
create policy freed_assignments_self_or_admin_select
on public.freed_assignments_log
for select
to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));

drop policy if exists anmeldestatus_admin_select on public.anmeldestatus_entries;
create policy anmeldestatus_admin_select
on public.anmeldestatus_entries
for select
to authenticated
using ((select private.is_admin()));

-- Views must never silently bypass the policies of their source tables.
alter view public.user_assignment_processes set (security_invoker = true);
alter view public.messages_with_recipients set (security_invoker = true);
alter view public.my_messages set (security_invoker = true);
alter view public.assignment_details_with_participants set (security_invoker = true);
alter view public.market_visits set (security_invoker = true);
alter view public.assignments_with_buddy_info set (security_invoker = true);
alter view public.todays_assignments set (security_invoker = true);

revoke all on public.user_assignment_processes from anon, authenticated;
revoke all on public.messages_with_recipients from anon, authenticated;
revoke all on public.my_messages from anon, authenticated;
revoke all on public.assignment_details_with_participants from anon, authenticated;
revoke all on public.market_visits from anon, authenticated;
revoke all on public.assignments_with_buddy_info from anon, authenticated;
revoke all on public.todays_assignments from anon, authenticated;

grant select on public.user_assignment_processes to service_role;
grant select on public.messages_with_recipients to service_role;
grant select on public.my_messages to service_role;
grant select on public.assignment_details_with_participants to service_role;
grant select on public.market_visits to service_role;
grant select on public.assignments_with_buddy_info to service_role;
grant select on public.todays_assignments to service_role;

-- Publicly executable definer functions were equivalent to unauthenticated
-- mutation endpoints. Only the backend service role may invoke them.
revoke all on function public.approve_special_status_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.decline_special_status_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.handle_buddy_tag_acceptance(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.soft_delete_message(uuid, uuid) from public, anon, authenticated;
revoke all on function public.check_and_update_tracking_status() from public, anon, authenticated;
revoke all on function public.apply_special_status_to_assignments() from public, anon, authenticated;
revoke all on function public.get_user_process_state(uuid) from public, anon, authenticated;

grant execute on function public.approve_special_status_request(uuid, uuid) to service_role;
grant execute on function public.decline_special_status_request(uuid, uuid) to service_role;
grant execute on function public.handle_buddy_tag_acceptance(uuid, uuid, text) to service_role;
grant execute on function public.soft_delete_message(uuid, uuid) to service_role;
grant execute on function public.check_and_update_tracking_status() to service_role;
grant execute on function public.apply_special_status_to_assignments() to service_role;
grant execute on function public.get_user_process_state(uuid) to service_role;

-- Keep the legacy helper available for policies, but prevent callers from
-- probing another account's role through its argument.
create or replace function public.is_user_admin(user_id_param uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select user_id_param = (select auth.uid()) and exists (
    select 1
    from public.user_profiles
    where user_id = (select auth.uid())
      and role in ('admin_staff', 'admin_of_admins')
  );
$$;
revoke all on function public.is_user_admin(uuid) from public, anon;
grant execute on function public.is_user_admin(uuid) to authenticated, service_role;

-- Replace self-editable user_metadata authorization with database-backed role checks.
-- Client code never writes this identity/authorization table. Removing all
-- mutation grants also prevents an own-row UPDATE policy from being used to
-- promote role, change user_id, or edit other authorization attributes.
drop policy if exists user_profiles_user_update_own on public.user_profiles;
drop policy if exists users_can_update_own_profile on public.user_profiles;
revoke all privileges on table public.user_profiles from anon, authenticated;
grant select on table public.user_profiles to authenticated;

-- Profile mutations are validated and audited by Self/Admin API routes.
revoke all privileges on table public.promotor_profiles from anon, authenticated;
grant select on table public.promotor_profiles to authenticated;
grant all privileges on table public.promotor_profiles to service_role;

drop policy if exists user_profiles_admin_read_all on public.user_profiles;
create policy user_profiles_admin_read_all
on public.user_profiles
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists user_profiles_admin_update_all on public.user_profiles;
create policy user_profiles_admin_update_all
on public.user_profiles
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "Admins have full access" on public.access_credentials;
drop policy if exists "Service role has full access" on public.access_credentials;
drop policy if exists "Users can delete own access credentials" on public.access_credentials;
drop policy if exists "Users can insert own access credentials" on public.access_credentials;
drop policy if exists "Users can insert own credentials" on public.access_credentials;
drop policy if exists "Users can update own access credentials" on public.access_credentials;
drop policy if exists "Users can update own credentials" on public.access_credentials;
drop policy if exists "Users can view own access credentials" on public.access_credentials;
drop policy if exists "Users can view own credentials" on public.access_credentials;

revoke all privileges on table public.access_credentials from anon, authenticated;
grant all privileges on table public.access_credentials to service_role;

drop policy if exists dienstvertrag_files_admin_all on public.dienstvertrag_files;
drop policy if exists dienstvertrag_files_promotor_read_own on public.dienstvertrag_files;
drop policy if exists dienstvertrag_files_service_role_all on public.dienstvertrag_files;
drop policy if exists dienstvertrag_files_self_select on public.dienstvertrag_files;
create policy dienstvertrag_files_self_select
on public.dienstvertrag_files for select to authenticated
using (user_id = (select auth.uid()));
create policy dienstvertrag_files_admin_all
on public.dienstvertrag_files for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "Admins have full access" on public.einsatznotiz_promotor;
drop policy if exists "Promotors can view notes" on public.einsatznotiz_promotor;
drop policy if exists "Service role has full access" on public.einsatznotiz_promotor;
drop policy if exists einsatznotiz_participant_select on public.einsatznotiz_promotor;
drop policy if exists einsatznotiz_admin_all on public.einsatznotiz_promotor;
create policy einsatznotiz_participant_select
on public.einsatznotiz_promotor for select to authenticated
using ((select private.is_admin()) or private.is_assignment_participant(assignment_id));
create policy einsatznotiz_admin_all
on public.einsatznotiz_promotor for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists dienstvertraege_admin_delete on storage.objects;
drop policy if exists dienstvertraege_admin_insert on storage.objects;
drop policy if exists dienstvertraege_admin_select on storage.objects;
drop policy if exists dienstvertraege_admin_update on storage.objects;

create policy dienstvertraege_admin_select
on storage.objects for select to authenticated
using (bucket_id = 'dienstvertraege' and (select private.is_admin()));
create policy dienstvertraege_admin_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'dienstvertraege' and (select private.is_admin()));
create policy dienstvertraege_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'dienstvertraege' and (select private.is_admin()))
with check (bucket_id = 'dienstvertraege' and (select private.is_admin()));
create policy dienstvertraege_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'dienstvertraege' and (select private.is_admin()));

-- Existing objects stay in place. Legacy public URLs are converted to paths and
-- signed by authorized API routes before this bucket becomes private.
update storage.buckets
set public = false
where id = 'einsatz-photos';
drop policy if exists "Everyone can view einsatz photos" on storage.objects;
drop policy if exists "Promotors can upload their own einsatz photos" on storage.objects;

-- Betroffenenrechte, Legal Holds and sensitive-access evidence. Existing
-- operational data is not modified by these additive structures.
create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null,
  subject_email text,
  request_type text not null check (request_type in (
    'access', 'correction', 'deletion', 'restriction', 'objection', 'portability', 'other'
  )),
  details text,
  status text not null default 'submitted' check (status in (
    'submitted', 'identity_check', 'in_progress', 'waiting_for_subject', 'completed', 'rejected', 'cancelled'
  )),
  submitted_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '1 month'),
  identity_verified_at timestamptz,
  identity_verified_by uuid,
  decision_reason text,
  internal_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.privacy_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.privacy_requests(id) on delete cascade,
  actor_user_id uuid,
  event_type text not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.legal_holds (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid,
  scope text not null,
  reason text not null,
  active boolean not null default true,
  created_by uuid not null,
  released_by uuid,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_access_audit (
  id bigint generated by default as identity primary key,
  actor_user_id uuid not null,
  action text not null,
  resource_type text not null,
  resource_id text,
  subject_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_privacy_requests_subject_submitted
on public.privacy_requests (subject_user_id, submitted_at desc);
create index if not exists idx_privacy_requests_status_due
on public.privacy_requests (status, due_at);
create index if not exists idx_privacy_request_events_request_created
on public.privacy_request_events (request_id, created_at);
create index if not exists idx_legal_holds_subject_active
on public.legal_holds (subject_user_id, active);
create index if not exists idx_data_access_audit_actor_created
on public.data_access_audit (actor_user_id, created_at desc);
create index if not exists idx_data_access_audit_subject_created
on public.data_access_audit (subject_user_id, created_at desc);

alter table public.privacy_requests enable row level security;
alter table public.privacy_request_events enable row level security;
alter table public.legal_holds enable row level security;
alter table public.data_access_audit enable row level security;

revoke all privileges on table public.privacy_requests from anon, authenticated;
revoke all privileges on table public.privacy_request_events from anon, authenticated;
revoke all privileges on table public.legal_holds from anon, authenticated;
revoke all privileges on table public.data_access_audit from anon, authenticated;
grant select on table public.privacy_requests to authenticated;
grant select on table public.privacy_request_events to authenticated;
grant select on table public.legal_holds to authenticated;
grant select on table public.data_access_audit to authenticated;
grant all privileges on table public.privacy_requests to service_role;
grant all privileges on table public.privacy_request_events to service_role;
grant all privileges on table public.legal_holds to service_role;
grant all privileges on table public.data_access_audit to service_role;
grant usage, select on sequence public.data_access_audit_id_seq to service_role;

drop policy if exists privacy_requests_self_select on public.privacy_requests;
drop policy if exists privacy_requests_admin_select on public.privacy_requests;
drop policy if exists privacy_request_events_admin_select on public.privacy_request_events;
drop policy if exists legal_holds_admin_select on public.legal_holds;
drop policy if exists data_access_audit_admin_select on public.data_access_audit;
create policy privacy_requests_self_select
on public.privacy_requests for select to authenticated
using (subject_user_id = (select auth.uid()));
create policy privacy_requests_admin_select
on public.privacy_requests for select to authenticated
using ((select private.is_admin()));
create policy privacy_request_events_admin_select
on public.privacy_request_events for select to authenticated
using ((select private.is_admin()));
create policy legal_holds_admin_select
on public.legal_holds for select to authenticated
using ((select private.is_admin()));
create policy data_access_audit_admin_select
on public.data_access_audit for select to authenticated
using ((select private.is_admin()));

create or replace function public.get_retention_preview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with hold_state as (
    select exists (
      select 1 from public.legal_holds where active and subject_user_id is null
    ) as global_hold
  )
  select jsonb_build_object(
    'generated_at', now(),
    'blocked_by_global_hold', (select global_hold from hold_state),
    'classes', jsonb_build_array(
      jsonb_build_object(
        'key', 'eddie_chat_15m',
        'eligible_count', case when (select global_hold from hold_state) then 0 else (
          select count(*) from public.eddie_chat_messages message
          where message.created_at < now() - interval '15 minutes'
            and not exists (
              select 1 from public.legal_holds hold
              where hold.active and hold.subject_user_id = message.user_id
                and hold.scope in ('all', 'chat', 'eddie')
            )
        ) end
      ),
      jsonb_build_object(
        'key', 'application_6m',
        'eligible_count', case when (select global_hold from hold_state) then 0 else (
          select count(*) from public.applications application
          where application.created_at < now() - interval '6 months'
            and application.status in ('rejected', 'received')
            and not exists (
              select 1 from public.promotor_profiles profile
              where profile.application_id = application.id
            )
        ) end
      ),
      jsonb_build_object(
        'key', 'location_coordinates_90d',
        'eligible_count', case when (select global_hold from hold_state) then 0 else (
          select count(*)
          from public.assignment_tracking tracking
          join public.assignments assignment on assignment.id = tracking.assignment_id
          where assignment.end_ts < now() - interval '90 days'
            and (tracking.start_latitude is not null or tracking.end_latitude is not null)
            and not exists (
              select 1 from public.legal_holds hold
              where hold.active and hold.subject_user_id = tracking.user_id
                and hold.scope in ('all', 'location', 'assignments')
            )
        ) end
      ),
      jsonb_build_object(
        'key', 'einsatz_photos_3y',
        'eligible_count', case when (select global_hold from hold_state) then 0 else (
          select count(*)
          from public.assignment_tracking tracking
          join public.assignments assignment on assignment.id = tracking.assignment_id
          where assignment.end_ts < now() - interval '3 years'
            and (
              tracking.foto_maschine_url is not null
              or tracking.foto_kapsellade_url is not null
              or tracking.foto_pos_gesamt_url is not null
              or tracking.foto_extra_url is not null
            )
            and not exists (
              select 1 from public.legal_holds hold
              where hold.active and hold.subject_user_id = tracking.user_id
                and hold.scope in ('all', 'photos', 'assignments')
            )
        ) end
      ),
      jsonb_build_object(
        'key', 'access_audit_24m',
        'eligible_count', case when (select global_hold from hold_state) then 0 else (
          select count(*) from public.data_access_audit audit
          where audit.created_at < now() - interval '24 months'
            and not exists (
              select 1 from public.legal_holds hold
              where hold.active and hold.subject_user_id = audit.subject_user_id
                and hold.scope in ('all', 'audit')
            )
        ) end
      )
    )
  );
$$;
revoke all on function public.get_retention_preview() from public, anon, authenticated;
grant execute on function public.get_retention_preview() to service_role;

-- Eddie promises a 15-minute conversation lifetime. Enforce it independently
-- of whether the user sends another message.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'salescrew-delete-expired-eddie-chat';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;
select cron.schedule(
  'salescrew-delete-expired-eddie-chat',
  '*/5 * * * *',
  $cleanup$
    delete from public.eddie_chat_messages message
    where message.created_at < now() - interval '15 minutes'
      and not exists (
        select 1 from public.legal_holds hold
        where hold.active
          and (hold.subject_user_id is null or hold.subject_user_id = message.user_id)
          and hold.scope in ('all', 'chat', 'eddie')
      )
  $cleanup$
);

commit;
