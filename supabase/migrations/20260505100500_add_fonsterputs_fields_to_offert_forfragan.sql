alter table public."offert_förfrågan"
  add column if not exists window_count integer,
  add column if not exists window_type text,
  add column if not exists glazed_balcony text,
  add column if not exists balcony_window_count integer;

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_fonsterputs_check;

alter table public."offert_förfrågan"
  add constraint offert_forfragan_fonsterputs_check
  check (
    (
      translate(lower(service_type), 'åäö', 'aao') = 'fonsterputs'
      and property_type in ('lagenhet', 'radhus', 'villa')
      and window_count is not null
      and window_count > 0
      and window_type in (
        '2-sidiga (In/utvandiga)',
        '4-sidiga (In/utvandiga samt emellan)',
        'Annan'
      )
      and glazed_balcony in ('Ja', 'Nej')
      and (
        (glazed_balcony = 'Ja' and balcony_window_count is not null and balcony_window_count > 0)
        or
        (glazed_balcony = 'Nej' and balcony_window_count is null)
      )
    )
    or
    (
      translate(lower(service_type), 'åäö', 'aao') <> 'fonsterputs'
      and window_count is null
      and window_type is null
      and glazed_balcony is null
      and balcony_window_count is null
    )
  ) not valid;
