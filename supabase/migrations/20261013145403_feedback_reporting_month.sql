-- Reporting period comes from the workbook; retain the actual upload/delivery timestamps.
alter table public.kpi_feedback add column if not exists wave_month date
  check (wave_month is null or extract(day from wave_month) = 1);
comment on column public.kpi_feedback.wave_month is 'Reporting month from the imported workbook, independent of created_at (delivery time).';
-- Historical imports contain duplicate employee/month records; preserve them.
create index if not exists kpi_feedback_employee_month_idx on public.kpi_feedback(user_id,wave_month)
  where wave_month is not null;
