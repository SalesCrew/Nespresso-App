alter table public.assignment_tracking
  add column if not exists market_latitude numeric(10, 7),
  add column if not exists market_longitude numeric(10, 7),
  add column if not exists market_geocoded_address text,
  add column if not exists market_geocoded_at timestamptz,
  add column if not exists start_latitude numeric(10, 7),
  add column if not exists start_longitude numeric(10, 7),
  add column if not exists start_accuracy_meters numeric(10, 2),
  add column if not exists start_location_captured_at timestamptz,
  add column if not exists start_distance_meters numeric(10, 2),
  add column if not exists start_location_status text,
  add column if not exists end_latitude numeric(10, 7),
  add column if not exists end_longitude numeric(10, 7),
  add column if not exists end_accuracy_meters numeric(10, 2),
  add column if not exists end_location_captured_at timestamptz,
  add column if not exists end_distance_meters numeric(10, 2),
  add column if not exists end_location_status text;

alter table public.assignment_tracking
  add constraint assignment_tracking_market_coordinates_valid
    check (
      (market_latitude is null and market_longitude is null and market_geocoded_address is null and market_geocoded_at is null)
      or (
        market_latitude between -90 and 90
        and market_longitude between -180 and 180
        and nullif(btrim(market_geocoded_address), '') is not null
        and market_geocoded_at is not null
      )
    ),
  add constraint assignment_tracking_start_location_complete
    check (
      (start_latitude is null and start_longitude is null and start_accuracy_meters is null and start_location_captured_at is null and start_distance_meters is null and start_location_status is null)
      or (
        start_latitude between -90 and 90
        and start_longitude between -180 and 180
        and start_accuracy_meters >= 0
        and start_location_captured_at is not null
        and start_distance_meters between 0 and 300
        and start_location_status = 'verified'
      )
    ),
  add constraint assignment_tracking_end_location_complete
    check (
      (end_latitude is null and end_longitude is null and end_accuracy_meters is null and end_location_captured_at is null and end_distance_meters is null and end_location_status is null)
      or (
        end_latitude between -90 and 90
        and end_longitude between -180 and 180
        and end_accuracy_meters >= 0
        and end_location_captured_at is not null
        and end_distance_meters between 0 and 300
        and end_location_status = 'verified'
      )
    );

comment on column public.assignment_tracking.market_latitude is 'Geocoded market latitude used for the latest successful assignment location verification.';
comment on column public.assignment_tracking.market_longitude is 'Geocoded market longitude used for the latest successful assignment location verification.';
comment on column public.assignment_tracking.start_location_status is 'Server-calculated start location verification result. Currently only verified attempts are persisted.';
comment on column public.assignment_tracking.end_location_status is 'Server-calculated end location verification result. Currently only verified attempts are persisted.';
