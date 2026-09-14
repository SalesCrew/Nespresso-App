begin;

alter table public.user_profiles
add column if not exists deleted boolean not null default false;

create index if not exists idx_user_profiles_active_promotors
on public.user_profiles (display_name, user_id)
where role = 'promotor' and deleted = false;

comment on column public.user_profiles.deleted is
'Soft-delete flag. True blocks app access and hides the promotor from active directories while preserving related records.';

commit;
