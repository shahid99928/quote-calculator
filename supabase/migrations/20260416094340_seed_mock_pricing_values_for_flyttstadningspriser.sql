update public.flyttstadningspriser
set
  base_fee = case property_type
    when 'lägenhet' then 1200
    when 'radhus' then 1700
    when 'villa' then 2200
    else base_fee
  end,
  price_per_sqm = case property_type
    when 'lägenhet' then 28
    when 'radhus' then 34
    when 'villa' then 40
    else price_per_sqm
  end;
