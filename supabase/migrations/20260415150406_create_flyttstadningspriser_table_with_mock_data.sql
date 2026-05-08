create table if not exists public.flyttstadningspriser (
  price_id bigint generated always as identity primary key,
  property_type text not null check (property_type in ('lägenhet', 'villa', 'radhus')),
  num_rooms integer not null check (num_rooms > 0),
  sqm_from numeric(7,2) not null check (sqm_from >= 0),
  sqm_to numeric(7,2) not null check (sqm_to >= sqm_from)
);

insert into public.flyttstadningspriser (property_type, num_rooms, sqm_from, sqm_to)
values
  ('lägenhet', 1, 20, 39),
  ('lägenhet', 2, 40, 59),
  ('lägenhet', 3, 60, 79),
  ('lägenhet', 4, 80, 99),
  ('villa', 3, 90, 129),
  ('villa', 4, 130, 169),
  ('villa', 5, 170, 220),
  ('radhus', 2, 55, 84),
  ('radhus', 3, 85, 114),
  ('radhus', 4, 115, 150);
