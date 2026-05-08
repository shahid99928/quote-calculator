alter table public.bostads_priser
  drop constraint if exists bostads_priser_service_type_check;

alter table public.bostads_priser
  add constraint bostads_priser_service_type_check
  check (
    service_type in (
      'Hemstadning',
      'Flyttstadning',
      'Storstadning',
      'Byggstadning',
      'Visningsstadning'
    )
  );

alter table public.bostads_priser
  drop constraint if exists bostads_priser_service_type_stadfrekvens_check;

alter table public.bostads_priser
  add constraint bostads_priser_service_type_stadfrekvens_check
  check (
    (
      service_type = 'Hemstadning'
      and "städ_frekvens" in (
        'Engångsstädning',
        '1 gång/vecka',
        '2 gånger/vecka',
        'Varje dag',
        '1 gång/månad',
        '2 gånger/månad'
      )
    )
    or
    (
      service_type in (
        'Flyttstadning',
        'Storstadning',
        'Byggstadning',
        'Visningsstadning'
      )
      and "städ_frekvens" = 'Engångsstädning'
    )
  );

insert into public.bostads_priser (property_type, num_rooms, sqm_from, sqm_to, base_fee, price_per_sqm, "städ_frekvens", service_type)
select
  b.property_type,
  b.num_rooms,
  b.sqm_from,
  b.sqm_to,
  b.base_fee,
  b.price_per_sqm,
  'Engångsstädning' as "städ_frekvens",
  s.service_type
from public.bostads_priser b
cross join (
  values
    ('Flyttstadning'::text),
    ('Storstadning'::text),
    ('Byggstadning'::text),
    ('Visningsstadning'::text)
) as s(service_type)
where b.service_type = 'Hemstadning'
  and b."städ_frekvens" = '1 gång/månad'
  and not exists (
    select 1
    from public.bostads_priser e
    where e.property_type = b.property_type
      and e.num_rooms = b.num_rooms
      and e.sqm_from = b.sqm_from
      and e.sqm_to = b.sqm_to
      and e."städ_frekvens" = 'Engångsstädning'
      and e.service_type = s.service_type
  );
