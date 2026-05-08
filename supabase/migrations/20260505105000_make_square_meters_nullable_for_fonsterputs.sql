alter table public."offert_förfrågan"
  alter column square_meters drop not null;

alter table public."offert_förfrågan"
  drop constraint if exists price_requests_square_meters_check;

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_square_meters_by_service_check;

alter table public."offert_förfrågan"
  add constraint offert_forfragan_square_meters_by_service_check
  check (
    (
      translate(lower(service_type), 'åäö', 'aao') = 'fonsterputs'
      and square_meters is null
    )
    or
    (
      translate(lower(service_type), 'åäö', 'aao') <> 'fonsterputs'
      and square_meters is not null
      and square_meters > 0
    )
  ) not valid;
