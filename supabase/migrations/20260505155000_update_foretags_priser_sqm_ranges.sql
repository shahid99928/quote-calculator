delete from public."företags_priser";

with local_types as (
  select * from (
    values
      ('Kontor'::text, 900::numeric, 1.00::numeric),
      ('Butik'::text, 1000::numeric, 1.12::numeric),
      ('Industri'::text, 1200::numeric, 1.35::numeric)
  ) as t(typ_av_lokal, base_fee, local_multiplier)
),
sqm_ranges as (
  select * from (
    values
      (50, 100, 24::numeric),
      (101, 200, 20::numeric),
      (201, 300, 17::numeric),
      (300, 500, 14::numeric)
  ) as t(sqm_from, sqm_to, base_price_per_sqm)
),
frequency_levels as (
  select * from (
    values
      ('Engångsstädning'::text, 1.45::numeric),
      ('1 gång/vecka'::text, 1.00::numeric),
      ('2 gånger/vecka'::text, 0.92::numeric),
      ('Varje dag'::text, 0.82::numeric),
      ('1 gång/månad'::text, 1.25::numeric),
      ('2 gånger/månad'::text, 1.15::numeric)
  ) as t("städ_frekvens", frequency_multiplier)
),
price_matrix as (
  select
    lt.typ_av_lokal,
    sr.sqm_from,
    sr.sqm_to,
    fl."städ_frekvens",
    round(lt.base_fee, 2) as base_fee,
    round(sr.base_price_per_sqm * lt.local_multiplier * fl.frequency_multiplier, 2) as price_per_sqm
  from local_types lt
  cross join sqm_ranges sr
  cross join frequency_levels fl
)
insert into public."företags_priser" (typ_av_lokal, sqm_from, sqm_to, "städ_frekvens", base_fee, price_per_sqm)
select
  typ_av_lokal,
  sqm_from,
  sqm_to,
  "städ_frekvens",
  base_fee,
  price_per_sqm
from price_matrix
on conflict (typ_av_lokal, sqm_from, sqm_to, "städ_frekvens")
do update set
  base_fee = excluded.base_fee,
  price_per_sqm = excluded.price_per_sqm;
