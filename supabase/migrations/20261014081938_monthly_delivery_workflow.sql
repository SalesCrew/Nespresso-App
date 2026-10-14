-- Imports are drafts. Preserve the visibility of records published by the old flow.
alter table public.kpi_monthly_sales add column sent_at timestamptz;
alter table public.kpi_praemien add column sent_at timestamptz;
update public.kpi_monthly_sales set sent_at = imported_at;
update public.kpi_praemien set sent_at = created_at;
alter table public.kpi_feedback add column if not exists wave_month date
  check (wave_month is null or extract(day from wave_month) = 1);
-- Preserve legacy duplicates; the send transaction locks the employee/month sales row.
create index if not exists kpi_feedback_employee_month_idx on public.kpi_feedback(user_id,wave_month)
  where wave_month is not null;
create index kpi_monthly_sales_pending_idx on public.kpi_monthly_sales(wave_month,user_id) where sent_at is null;
create index kpi_praemien_pending_idx on public.kpi_praemien(wave_month,user_id) where sent_at is null;

-- Existing legacy feedback has no known reporting month; do not invent one from its send date.
comment on column public.kpi_feedback.wave_month is 'Reporting month from the imported workbook, independent of created_at (delivery time).';
comment on column public.kpi_monthly_sales.sent_at is 'NULL until an administrator explicitly validates and sends these monthly KPIs.';
comment on column public.kpi_praemien.sent_at is 'NULL until an administrator explicitly validates and sends the matching monthly premium.';

drop policy "Promotors read own monthly sales" on public.kpi_monthly_sales;
create policy "Promotors read own monthly sales" on public.kpi_monthly_sales for select to authenticated
  using ((select auth.uid()) = user_id and sent_at is not null);
drop policy "Promotors can read own kpi_praemien" on public.kpi_praemien;
create policy "Promotors can read own kpi_praemien" on public.kpi_praemien for select to authenticated
  using ((select auth.uid()) = user_id and sent_at is not null and exists (
    select 1 from public.user_profiles where user_id = (select auth.uid()) and role = 'promotor' and deleted is not true
  ));
grant select on public.kpi_praemien to authenticated;
grant update(sent_at,updated_at) on public.kpi_monthly_sales,public.kpi_praemien to authenticated;
grant select,insert on public.kpi_feedback to authenticated;
grant update(read) on public.kpi_feedback to authenticated;

-- Old monthly imports were already visible. Give those known periods a history card without notifying employees again.
insert into public.kpi_feedback(user_id,wave_month,mc_et,tma,vl_value,feedback_text,magic_touch,read,created_at)
select sale.user_id,sale.wave_month,
  coalesce(round(mc / nullif(einsatztage,0),1),0),
  coalesce(round(tma::numeric / nullif(mc,0) * 100,1),0),
  coalesce(round(vl::numeric / nullif(mc,0) * 100,1),0),'',null,true,sent_at
from public.kpi_monthly_sales sale
where not exists (select 1 from public.kpi_feedback feedback where feedback.user_id = sale.user_id and feedback.wave_month = sale.wave_month)
  and coalesce(round(mc / nullif(einsatztage,0),1),0) <= 999.9
  and coalesce(round(tma::numeric / nullif(mc,0) * 100,1),0) <= 9999.9
  and coalesce(round(vl::numeric / nullif(mc,0) * 100,1),0) <= 9999.9
;

-- Protect delivered quantities even if an import races with a send transaction.
create function public.guard_monthly_delivery() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.sent_at is not null then
    if new.sent_at is distinct from old.sent_at then
      raise sqlstate 'PT409' using message = 'Bereits gesendete Zeilen dürfen nicht erneut importiert werden.';
    end if;
    if tg_table_name = 'kpi_monthly_sales' then
      if (to_jsonb(new) - array['updated_at','sent_at']) is distinct from (to_jsonb(old) - array['updated_at','sent_at']) then
        raise sqlstate 'PT409' using message = 'Bereits gesendete KPI-Werte bleiben unverändert.';
      end if;
    elsif (to_jsonb(new) - array['updated_at','rate_snapshot','total_amount','sent_at'])
      is distinct from (to_jsonb(old) - array['updated_at','rate_snapshot','total_amount','sent_at']) then
      raise sqlstate 'PT409' using message = 'Gespeicherte Verkaufsmengen bleiben unverändert.';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
create trigger guard_monthly_sales_delivery before update on public.kpi_monthly_sales
  for each row execute function public.guard_monthly_delivery();
create trigger guard_monthly_premium_delivery before update on public.kpi_praemien
  for each row execute function public.guard_monthly_delivery();
revoke all on function public.guard_monthly_delivery() from public;

-- One transaction: verify the reviewed versions, publish exactly the chosen rows and write history.
create function public.send_monthly_statistics(p_wave_month date,p_kind text,p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  payload jsonb;
  sale public.kpi_monthly_sales%rowtype;
  premium public.kpi_praemien%rowtype;
  person uuid;
  quantity numeric;
  expected_total numeric;
  sent integer := 0;
  feedback_text text;
  mc_et numeric;
  tap numeric;
  vl_share numeric;
  has_rate boolean;
begin
  if not exists (select 1 from public.user_profiles where user_id = (select auth.uid())
    and role in ('admin_staff','admin_of_admins') and deleted is not true) then
    raise insufficient_privilege using message = 'Nur aktive Administratoren dürfen senden.';
  end if;
  if p_kind is null or p_kind not in ('kpi','premium') or p_wave_month is null or extract(day from p_wave_month) <> 1
    or jsonb_typeof(p_rows) is distinct from 'array' then
    raise invalid_parameter_value using message = 'Ungültiger Monat oder Versand.';
  end if;
  if jsonb_array_length(p_rows) not between 1 and 1000
    or (select count(distinct value->>'userId') from jsonb_array_elements(p_rows)) <> jsonb_array_length(p_rows) then
    raise invalid_parameter_value using message = 'Bitte eindeutige validierte Zeilen auswählen.';
  end if;
  -- Consistent lock order for overlapping batches. No network/model calls inside the transaction.
  for payload in select value from jsonb_array_elements(p_rows) order by value->>'userId' loop
    person := (payload->>'userId')::uuid;
    if not exists (select 1 from public.user_profiles where user_id = person and role = 'promotor' and deleted is not true) then
      raise invalid_parameter_value using message = 'Promotor nicht mehr aktiv.';
    end if;
    select * into sale from public.kpi_monthly_sales where user_id = person and wave_month = p_wave_month for update;
    if not found or payload->>'salesUpdatedAt' is null or sale.updated_at <> (payload->>'salesUpdatedAt')::timestamptz then
      raise sqlstate 'PT409' using message = 'KPI-Werte haben sich geändert. Bitte erneut prüfen und validieren.';
    end if;
    mc_et := case when sale.einsatztage > 0 then round(sale.mc / sale.einsatztage,1) else 0 end;
    tap := case when sale.mc > 0 then round(sale.tma::numeric / sale.mc * 100,1) else 0 end;
    vl_share := case when sale.mc > 0 then round(sale.vl::numeric / sale.mc * 100,1) else 0 end;
    if mc_et not between 0 and 999.9 or tap not between 0 and 100 or vl_share not between 0 and 100
      or (sale.mc > 0 and (sale.tma > sale.mc or sale.vl > sale.mc)) then
      raise invalid_parameter_value using message = 'KPI-Werte sind nicht versandfähig.';
    end if;
    if p_kind = 'kpi' and sale.sent_at is not null then
      raise sqlstate 'PT409' using message = 'Diese KPIs wurden bereits gesendet.';
    end if;
    if p_kind = 'premium' then
      select * into premium from public.kpi_praemien where user_id = person and wave_month = p_wave_month for update;
      if not found or premium.sent_at is not null or payload->>'premiumUpdatedAt' is null
        or premium.updated_at <> (payload->>'premiumUpdatedAt')::timestamptz then
        raise sqlstate 'PT409' using message = 'Prämien haben sich geändert oder wurden bereits gesendet. Bitte erneut prüfen.';
      end if;
      if (sale.vl,sale.vl_up,sale.tma,sale.gs,sale.aeroccino)
        is distinct from (premium.vertuo,premium.vertuo_pop,premium.tma,premium.gutscheine,premium.aeroccino) then
        raise invalid_parameter_value using message = 'KPI- und Prämienmengen stimmen nicht überein.';
      end if;
      expected_total := 0;
      has_rate := false;
      for quantity in select (premium.rate_snapshot->>key)::numeric from unnest(array['vl','vl_up','tma','gs','aeroccino']) key loop
        if quantity is null or quantity < 0 or quantity <> round(quantity,2) then raise invalid_parameter_value using message = 'Prämiensätze fehlen.'; end if;
        has_rate := has_rate or quantity > 0;
      end loop;
      if not has_rate then raise invalid_parameter_value using message = 'Prämiensätze fehlen.'; end if;
      expected_total := round(premium.vertuo * (premium.rate_snapshot->>'vl')::numeric,2)
        + round(premium.vertuo_pop * (premium.rate_snapshot->>'vl_up')::numeric,2)
        + round(premium.tma * (premium.rate_snapshot->>'tma')::numeric,2)
        + round(premium.gutscheine * (premium.rate_snapshot->>'gs')::numeric,2)
        + round(premium.aeroccino * (premium.rate_snapshot->>'aeroccino')::numeric,2);
      if premium.total_amount is null or premium.total_amount is distinct from expected_total then
        raise invalid_parameter_value using message = 'Prämienbetrag muss vor dem Versand geprüft werden.';
      end if;
      update public.kpi_praemien set sent_at = now(),updated_at = now() where id = premium.id;
    end if;
    feedback_text := trim(coalesce(payload->>'feedbackText',''));
    if length(feedback_text) > 12000 or length(coalesce(payload->>'magicTouch','')) > 100 then
      raise invalid_parameter_value using message = 'Feedback ist zu lang.';
    end if;
    if sale.sent_at is null then
      if exists (select 1 from public.kpi_feedback where user_id = person and wave_month = p_wave_month) then
        raise sqlstate 'PT409' using message = 'Für diesen Monat wurden bereits KPIs gesendet.';
      end if;
      insert into public.kpi_feedback(user_id,wave_month,mc_et,tma,vl_value,feedback_text,magic_touch,read)
      values(person,p_wave_month,mc_et,tap,vl_share,feedback_text,
        case when feedback_text <> '' then nullif(payload->>'magicTouch','') else null end,false);
      update public.kpi_monthly_sales set sent_at = now(),updated_at = now() where id = sale.id;
    elsif p_kind = 'premium' then
      -- Keep one employee/month history card, including any already reviewed text.
      insert into public.kpi_feedback(user_id,wave_month,mc_et,tma,vl_value,feedback_text,magic_touch,read)
      select person,p_wave_month,mc_et,tap,vl_share,'',null,false
      where not exists (select 1 from public.kpi_feedback where user_id = person and wave_month = p_wave_month);
      update public.kpi_feedback set read = false where user_id = person and wave_month = p_wave_month;
    end if;
    sent := sent + 1;
  end loop;
  return jsonb_build_object('count',sent,'waveMonth',to_char(p_wave_month,'YYYY-MM'),'kind',p_kind);
end;
$$;
revoke all on function public.send_monthly_statistics(date,text,jsonb) from public,anon;
grant execute on function public.send_monthly_statistics(date,text,jsonb) to authenticated;
