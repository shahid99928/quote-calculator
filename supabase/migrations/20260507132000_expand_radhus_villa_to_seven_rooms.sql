delete from public.bostads_priser
where translate(lower(property_type), 'åäö', 'aao') in ('radhus', 'villa');

insert into public.bostads_priser (property_type, num_rooms, sqm_from, sqm_to, base_fee, price_per_sqm)
values
  ('radhus', 1, 30, 59, 1600, 31.00),
  ('radhus', 2, 60, 89, 1700, 32.00),
  ('radhus', 3, 90, 119, 1800, 33.00),
  ('radhus', 4, 120, 149, 1950, 34.00),
  ('radhus', 5, 150, 179, 2100, 35.00),
  ('radhus', 6, 180, 209, 2250, 36.00),
  ('radhus', 7, 210, 250, 2400, 37.00),
  ('villa', 3, 90, 129, 2300, 40.00),
  ('villa', 4, 130, 169, 2500, 41.50),
  ('villa', 5, 170, 209, 2700, 43.00),
  ('villa', 6, 210, 259, 2950, 44.50),
  ('villa', 7, 260, 320, 3200, 46.00);
