create table public.kpi_monthly_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wave_month date not null check (extract(day from wave_month) = 1),
  einsatztage numeric(12, 6) not null default 0 check (einsatztage >= 0),
  mc integer not null default 0 check (mc >= 0),
  tma integer not null default 0 check (tma >= 0),
  gs integer not null default 0 check (gs >= 0),
  vl integer not null default 0 check (vl >= 0),
  vl_up integer not null default 0 check (vl_up >= 0),
  aeroccino integer not null default 0 check (aeroccino >= 0),
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, wave_month)
);

create index kpi_monthly_sales_wave_idx on public.kpi_monthly_sales (wave_month desc);
alter table public.kpi_monthly_sales enable row level security;
grant select on public.kpi_monthly_sales to authenticated;

create policy "Promotors read own monthly sales"
on public.kpi_monthly_sales for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Admins manage monthly sales"
on public.kpi_monthly_sales for all to authenticated
using (
  exists (
    select 1 from public.user_profiles up
    where up.user_id = (select auth.uid())
      and up.role in ('admin_staff', 'admin_of_admins')
  )
)
with check (
  exists (
    select 1 from public.user_profiles up
    where up.user_id = (select auth.uid())
      and up.role in ('admin_staff', 'admin_of_admins')
  )
);

create table public.kpi_premium_rates (
  id uuid primary key default gen_random_uuid(),
  wave_month date not null check (extract(day from wave_month) = 1),
  user_id uuid references auth.users(id) on delete cascade,
  vl numeric(10, 2) not null default 0 check (vl >= 0),
  vl_up numeric(10, 2) not null default 0 check (vl_up >= 0),
  tma numeric(10, 2) not null default 0 check (tma >= 0),
  gs numeric(10, 2) not null default 0 check (gs >= 0),
  aeroccino numeric(10, 2) not null default 0 check (aeroccino >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index kpi_premium_rates_default_idx
on public.kpi_premium_rates (wave_month) where user_id is null;
create unique index kpi_premium_rates_user_idx
on public.kpi_premium_rates (wave_month, user_id) where user_id is not null;
alter table public.kpi_premium_rates enable row level security;
grant select on public.kpi_premium_rates to authenticated;

create policy "Admins manage premium rates"
on public.kpi_premium_rates for all to authenticated
using (
  exists (
    select 1 from public.user_profiles up
    where up.user_id = (select auth.uid())
      and up.role in ('admin_staff', 'admin_of_admins')
  )
)
with check (
  exists (
    select 1 from public.user_profiles up
    where up.user_id = (select auth.uid())
      and up.role in ('admin_staff', 'admin_of_admins')
  )
);

alter table public.kpi_praemien
  add column rate_snapshot jsonb,
  add column total_amount numeric(12, 2);

comment on column public.kpi_praemien.rate_snapshot is
  'Per-person, per-month unit rates used at import. Later rate changes do not rewrite this snapshot.';
comment on column public.kpi_praemien.total_amount is
  'Calculated commission from counts and rate_snapshot, in euros; no tax classification implied.';
