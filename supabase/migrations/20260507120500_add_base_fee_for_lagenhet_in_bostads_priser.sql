update public.bostads_priser
set base_fee = case num_rooms
  when 1 then 850
  when 2 then 1000
  when 3 then 1200
  when 4 then 1450
  when 5 then 1700
  when 6 then 1950
  else base_fee
end
where translate(lower(property_type), 'åäö', 'aao') = 'lagenhet'
  and num_rooms between 1 and 6;
