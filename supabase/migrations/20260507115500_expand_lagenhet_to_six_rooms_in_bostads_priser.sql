delete from public.bostads_priser
where translate(lower(property_type), 'åäö', 'aao') = 'lagenhet';

insert into public.bostads_priser (property_type, num_rooms, sqm_from, sqm_to, base_fee, price_per_sqm)
values
  ('lägenhet', 1, 20, 44, 0, 25.50),
  ('lägenhet', 2, 45, 64, 0, 26.50),
  ('lägenhet', 3, 65, 84, 0, 27.50),
  ('lägenhet', 4, 85, 104, 0, 28.50),
  ('lägenhet', 5, 105, 124, 0, 29.50),
  ('lägenhet', 6, 125, 150, 0, 30.50);
