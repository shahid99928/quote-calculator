-- Mock pricing was missing radhus with 1 room and smaller sqm (e.g. 25 m²).
insert into public.bostads_priser (property_type, num_rooms, sqm_from, sqm_to, base_fee, price_per_sqm)
values ('radhus', 1, 20, 54, 1700, 34);

-- Villa: add smaller homes (previously only 3+ rooms from 90 m²).
insert into public.bostads_priser (property_type, num_rooms, sqm_from, sqm_to, base_fee, price_per_sqm)
values
  ('villa', 1, 50, 89, 2200, 40),
  ('villa', 2, 90, 129, 2200, 40);
