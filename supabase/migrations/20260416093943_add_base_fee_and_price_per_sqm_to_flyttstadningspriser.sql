alter table public.flyttstadningspriser
  add column if not exists base_fee numeric(10,2) not null default 0 check (base_fee >= 0),
  add column if not exists price_per_sqm numeric(10,2) not null default 0 check (price_per_sqm >= 0);
