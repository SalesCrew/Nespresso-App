begin;

with source_rows as (
  select
    id,
    "socialSecurityNumber" as current_value,
    regexp_replace(coalesce("socialSecurityNumber", ''), '[^0-9]', '', 'g') as sv_digits,
    case
      when btrim(coalesce("birthDate", '')) ~ '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$'
        then substring(btrim("birthDate") from 1 for 2)
          || substring(btrim("birthDate") from 4 for 2)
          || substring(btrim("birthDate") from 9 for 2)
      when btrim(coalesce("birthDate", '')) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        then substring(btrim("birthDate") from 9 for 2)
          || substring(btrim("birthDate") from 6 for 2)
          || substring(btrim("birthDate") from 3 for 2)
      when btrim(coalesce("birthDate", '')) ~ '^[0-9]{8}$'
        then substring(btrim("birthDate") from 1 for 4)
          || substring(btrim("birthDate") from 7 for 2)
      else null
    end as birth_suffix
  from public.applications
  where nullif(btrim(coalesce("socialSecurityNumber", '')), '') is not null
), normalized as (
  select
    id,
    current_value,
    case
      when birth_suffix is null then null
      when length(sv_digits) = 4 then sv_digits || birth_suffix
      when length(sv_digits) = 10 and right(sv_digits, 6) = birth_suffix then sv_digits
      when length(sv_digits) = 10 and left(sv_digits, 6) = birth_suffix
        then substring(sv_digits from 7 for 4) || birth_suffix
      when length(sv_digits) = 16
        and left(sv_digits, 6) = birth_suffix
        and right(sv_digits, 6) = birth_suffix
        then substring(sv_digits from 7 for 4) || birth_suffix
      else null
    end as normalized_value
  from source_rows
)
update public.applications as applications
set "socialSecurityNumber" = normalized.normalized_value
from normalized
where applications.id = normalized.id
  and normalized.normalized_value is not null
  and applications."socialSecurityNumber" is distinct from normalized.normalized_value;

with source_rows as (
  select
    user_id,
    social_security_number as current_value,
    regexp_replace(coalesce(social_security_number, ''), '[^0-9]', '', 'g') as sv_digits,
    case
      when btrim(coalesce(birth_date, '')) ~ '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$'
        then substring(btrim(birth_date) from 1 for 2)
          || substring(btrim(birth_date) from 4 for 2)
          || substring(btrim(birth_date) from 9 for 2)
      when btrim(coalesce(birth_date, '')) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        then substring(btrim(birth_date) from 9 for 2)
          || substring(btrim(birth_date) from 6 for 2)
          || substring(btrim(birth_date) from 3 for 2)
      when btrim(coalesce(birth_date, '')) ~ '^[0-9]{8}$'
        then substring(btrim(birth_date) from 1 for 4)
          || substring(btrim(birth_date) from 7 for 2)
      else null
    end as birth_suffix
  from public.promotor_profiles
  where nullif(btrim(coalesce(social_security_number, '')), '') is not null
), normalized as (
  select
    user_id,
    current_value,
    case
      when birth_suffix is null then null
      when length(sv_digits) = 4 then sv_digits || birth_suffix
      when length(sv_digits) = 10 and right(sv_digits, 6) = birth_suffix then sv_digits
      when length(sv_digits) = 10 and left(sv_digits, 6) = birth_suffix
        then substring(sv_digits from 7 for 4) || birth_suffix
      when length(sv_digits) = 16
        and left(sv_digits, 6) = birth_suffix
        and right(sv_digits, 6) = birth_suffix
        then substring(sv_digits from 7 for 4) || birth_suffix
      else null
    end as normalized_value
  from source_rows
)
update public.promotor_profiles as profiles
set social_security_number = normalized.normalized_value,
    updated_at = now()
from normalized
where profiles.user_id = normalized.user_id
  and normalized.normalized_value is not null
  and profiles.social_security_number is distinct from normalized.normalized_value;

commit;
