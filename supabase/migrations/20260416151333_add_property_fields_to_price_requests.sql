alter table public.price_requests
  add column if not exists property_type text,
  add column if not exists num_rooms integer;
