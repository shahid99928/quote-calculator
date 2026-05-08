create table if not exists public."fönsterputs_priser" (
  price_id bigint generated always as identity primary key,
  property_type text not null check (property_type in ('lagenhet', 'radhus', 'villa')),
  window_type text not null check (
    window_type in (
      '2-sidiga (In/utvandiga)',
      '4-sidiga (In/utvandiga samt emellan)',
      'Annan'
    )
  ),
  glazed_balcony text not null check (glazed_balcony in ('Ja', 'Nej')),
  window_count_from integer not null check (window_count_from > 0),
  window_count_to integer not null check (window_count_to >= window_count_from),
  base_fee numeric(10,2) not null check (base_fee >= 0),
  price_per_window numeric(10,2) not null check (price_per_window >= 0),
  balcony_window_price numeric(10,2) not null check (balcony_window_price >= 0),
  unique (property_type, window_type, glazed_balcony, window_count_from, window_count_to)
);

alter table public."fönsterputs_priser" enable row level security;

with property_types as (
  select * from (values
    ('lagenhet'::text, 1.00::numeric),
    ('radhus'::text, 1.08::numeric),
    ('villa'::text, 1.15::numeric)
  ) as t(property_type, property_factor)
),
window_types as (
  select * from (values
    ('2-sidiga (In/utvandiga)'::text, 1.00::numeric),
    ('4-sidiga (In/utvandiga samt emellan)'::text, 1.60::numeric),
    ('Annan'::text, 1.25::numeric)
  ) as t(window_type, window_type_factor)
),
glazed_options as (
  select * from (values
    ('Nej'::text, 0::numeric),
    ('Ja'::text, 1::numeric)
  ) as t(glazed_balcony, glazed_flag)
),
window_ranges as (
  select * from (values
    (1, 10, 350::numeric, 95::numeric),
    (11, 20, 350::numeric, 88::numeric),
    (21, 35, 350::numeric, 82::numeric),
    (36, 60, 350::numeric, 76::numeric)
  ) as t(window_count_from, window_count_to, base_fee, base_price_per_window)
)
insert into public."fönsterputs_priser" (
  property_type,
  window_type,
  glazed_balcony,
  window_count_from,
  window_count_to,
  base_fee,
  price_per_window,
  balcony_window_price
)
select
  p.property_type,
  w.window_type,
  g.glazed_balcony,
  r.window_count_from,
  r.window_count_to,
  round(r.base_fee * p.property_factor, 2) as base_fee,
  round(r.base_price_per_window * p.property_factor * w.window_type_factor, 2) as price_per_window,
  round((60 + (15 * g.glazed_flag)) * p.property_factor, 2) as balcony_window_price
from property_types p
cross join window_types w
cross join glazed_options g
cross join window_ranges r
on conflict (property_type, window_type, glazed_balcony, window_count_from, window_count_to)
do update set
  base_fee = excluded.base_fee,
  price_per_window = excluded.price_per_window,
  balcony_window_price = excluded.balcony_window_price;
