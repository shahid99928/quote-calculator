delete from public.bostads_priser
where translate(lower(property_type), 'åäö', 'aao') = 'villa'
  and num_rooms in (1, 2);
