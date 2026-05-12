-- Replace Dienstvertrag generated/sign flow with admin file import flow
-- Run this migration before deploying the code changes.

-- 1) New canonical weekly hours source
alter table public.promotor_profiles
  add column if not exists contract_hours_per_week numeric(6,2);

-- 2) New Dienstvertrag file table
create table if not exists public.dienstvertrag_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_ext text not null check (file_ext in ('pdf', 'doc', 'docx')),
  is_active boolean not null default false,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dienstvertrag_files_user_created
  on public.dienstvertrag_files(user_id, created_at desc);

create unique index if not exists uq_dienstvertrag_files_one_active_per_user
  on public.dienstvertrag_files(user_id)
  where is_active = true;

create or replace function public.set_updated_at_dienstvertrag_files()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_updated_at_dienstvertrag_files on public.dienstvertrag_files;
create trigger trg_set_updated_at_dienstvertrag_files
before update on public.dienstvertrag_files
for each row execute function public.set_updated_at_dienstvertrag_files();

-- 2b) Atomic activation helper (demote old + activate target in one transaction)
create or replace function public.activate_dienstvertrag_file(
  p_user_id uuid,
  p_file_id uuid
)
returns void
language plpgsql
security invoker
as $$
declare
  v_has_file_path boolean;
begin
  select (file_path is not null)
  into v_has_file_path
  from public.dienstvertrag_files
  where id = p_file_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'dienstvertrag file not found for user';
  end if;

  if not v_has_file_path then
    raise exception 'cannot activate contract without file path';
  end if;

  update public.dienstvertrag_files
  set is_active = false,
      updated_at = now()
  where user_id = p_user_id
    and is_active = true
    and id <> p_file_id;

  update public.dienstvertrag_files
  set is_active = true,
      updated_at = now()
  where user_id = p_user_id
    and id = p_file_id;
end;
$$;

revoke execute on function public.activate_dienstvertrag_file(uuid, uuid) from public;
revoke execute on function public.activate_dienstvertrag_file(uuid, uuid) from anon;
revoke execute on function public.activate_dienstvertrag_file(uuid, uuid) from authenticated;
grant execute on function public.activate_dienstvertrag_file(uuid, uuid) to service_role;

-- 3) Bucket for contract files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dienstvertraege',
  'dienstvertraege',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- 4) RLS for new table
alter table public.dienstvertrag_files enable row level security;

drop policy if exists "dienstvertrag_files_admin_all" on public.dienstvertrag_files;
create policy "dienstvertrag_files_admin_all"
on public.dienstvertrag_files
for all
using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('admin_of_admins', 'admin_staff'))
with check ((auth.jwt() -> 'user_metadata' ->> 'role') in ('admin_of_admins', 'admin_staff'));

drop policy if exists "dienstvertrag_files_promotor_read_own" on public.dienstvertrag_files;
create policy "dienstvertrag_files_promotor_read_own"
on public.dienstvertrag_files
for select
using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'promotor' and user_id = auth.uid());

drop policy if exists "dienstvertrag_files_service_role_all" on public.dienstvertrag_files;
create policy "dienstvertrag_files_service_role_all"
on public.dienstvertrag_files
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- 5) Storage object policies (folder convention: <user_id>/...)
drop policy if exists "dienstvertraege_admin_select" on storage.objects;
create policy "dienstvertraege_admin_select"
on storage.objects
for select
using (
  bucket_id = 'dienstvertraege'
  and (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin_of_admins', 'admin_staff')
);

drop policy if exists "dienstvertraege_admin_insert" on storage.objects;
create policy "dienstvertraege_admin_insert"
on storage.objects
for insert
with check (
  bucket_id = 'dienstvertraege'
  and (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin_of_admins', 'admin_staff')
);

drop policy if exists "dienstvertraege_admin_update" on storage.objects;
create policy "dienstvertraege_admin_update"
on storage.objects
for update
using (
  bucket_id = 'dienstvertraege'
  and (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin_of_admins', 'admin_staff')
)
with check (
  bucket_id = 'dienstvertraege'
  and (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin_of_admins', 'admin_staff')
);

drop policy if exists "dienstvertraege_admin_delete" on storage.objects;
create policy "dienstvertraege_admin_delete"
on storage.objects
for delete
using (
  bucket_id = 'dienstvertraege'
  and (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin_of_admins', 'admin_staff')
);

drop policy if exists "dienstvertraege_promotor_select_own_folder" on storage.objects;
create policy "dienstvertraege_promotor_select_own_folder"
on storage.objects
for select
using (
  bucket_id = 'dienstvertraege'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 6) Backfill weekly hours from old active contracts
update public.promotor_profiles p
set contract_hours_per_week = c.hours_per_week
from (
  select distinct on (user_id) user_id, hours_per_week
  from public.contracts
  where is_active = true and hours_per_week is not null
  order by user_id, created_at desc
) c
where p.user_id = c.user_id
  and p.contract_hours_per_week is null;

-- 7) Backfill historical contract files from old contracts table
insert into public.dienstvertrag_files (
  user_id, file_path, file_name, mime_type, file_ext, is_active, uploaded_by, created_at, updated_at
)
select
  c.user_id,
  c.file_path,
  regexp_replace(c.file_path, '^.*/', ''),
  case
    when lower(c.file_path) like '%.docx' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    when lower(c.file_path) like '%.doc' then 'application/msword'
    else 'application/pdf'
  end as mime_type,
  case
    when lower(c.file_path) like '%.docx' then 'docx'
    when lower(c.file_path) like '%.doc' then 'doc'
    else 'pdf'
  end as file_ext,
  coalesce(c.is_active, false),
  null,
  coalesce(c.created_at, now()),
  coalesce(c.updated_at, now())
from public.contracts c
where c.file_path is not null
  and not exists (
    select 1
    from public.dienstvertrag_files d
    where d.user_id = c.user_id
      and d.file_path = c.file_path
  );

-- Optional cleanup SQL (run only after code cutover is verified):
-- drop table if exists public.sent_dienstvertrag cascade;
-- drop table if exists public.contracts cascade;
