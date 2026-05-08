alter table public.bostads_priser
  add column if not exists "städ_frekvens" text;

alter table public.bostads_priser
  drop constraint if exists bostads_priser_stad_frekvens_check;

alter table public.bostads_priser
  add constraint bostads_priser_stad_frekvens_check
  check (
    "städ_frekvens" is null
    or "städ_frekvens" in (
      'Engångsstädning',
      '1 gång/vecka',
      '2 gånger/vecka',
      'Varje dag',
      '1 gång/månad',
      '2 gånger/månad'
    )
  );

delete from public.bostads_priser
where "städ_frekvens" is not null;

with frequency_factors as (
  select *
  from (values
    ('Engångsstädning'::text, 1.20::numeric),
    ('1 gång/vecka'::text, 0.82::numeric),
    ('2 gånger/vecka'::text, 0.72::numeric),
    ('Varje dag'::text, 0.62::numeric),
    ('1 gång/månad'::text, 1.00::numeric),
    ('2 gånger/månad'::text, 0.90::numeric)
  ) as f(städ_frekvens, factor)
)
insert into public.bostads_priser (property_type, num_rooms, sqm_from, sqm_to, base_fee, price_per_sqm, "städ_frekvens")
select
  b.property_type,
  b.num_rooms,
  b.sqm_from,
  b.sqm_to,
  round((b.base_fee * f.factor)::numeric, 2),
  round((b.price_per_sqm * f.factor)::numeric, 2),
  f."städ_frekvens"
from public.bostads_priser b
cross join frequency_factors f
where b."städ_frekvens" is null;
