create table if not exists public."företags_priser" (
  price_id bigint generated always as identity primary key,
  sqm_from integer not null check (sqm_from > 0),
  sqm_to integer not null check (sqm_to >= sqm_from),
  "städ_frekvens" text not null check ("städ_frekvens" in (
    '1 gång/vecka',
    '2 gånger/vecka',
    'Varje dag',
    '1 gång/månad',
    '2 gånger/månad'
  )),
  base_fee numeric(10,2) not null default 1000 check (base_fee >= 0),
  price_per_sqm numeric(10,2) not null check (price_per_sqm >= 0),
  unique (sqm_from, sqm_to, "städ_frekvens")
);

alter table public."företags_priser" enable row level security;

insert into public."företags_priser" (sqm_from, sqm_to, "städ_frekvens", base_fee, price_per_sqm)
values
  (10, 50, '1 gång/vecka', 1000, 35),
  (10, 50, '2 gånger/vecka', 1000, 32),
  (10, 50, 'Varje dag', 1000, 28),
  (10, 50, '1 gång/månad', 1000, 45),
  (10, 50, '2 gånger/månad', 1000, 42),

  (51, 100, '1 gång/vecka', 1000, 30),
  (51, 100, '2 gånger/vecka', 1000, 27),
  (51, 100, 'Varje dag', 1000, 24),
  (51, 100, '1 gång/månad', 1000, 38),
  (51, 100, '2 gånger/månad', 1000, 36),

  (101, 150, '1 gång/vecka', 1000, 27),
  (101, 150, '2 gånger/vecka', 1000, 24),
  (101, 150, 'Varje dag', 1000, 21),
  (101, 150, '1 gång/månad', 1000, 34),
  (101, 150, '2 gånger/månad', 1000, 32),

  (151, 200, '1 gång/vecka', 1000, 24),
  (151, 200, '2 gånger/vecka', 1000, 22),
  (151, 200, 'Varje dag', 1000, 19),
  (151, 200, '1 gång/månad', 1000, 31),
  (151, 200, '2 gånger/månad', 1000, 29),

  (200, 300, '1 gång/vecka', 1000, 22),
  (200, 300, '2 gånger/vecka', 1000, 20),
  (200, 300, 'Varje dag', 1000, 17),
  (200, 300, '1 gång/månad', 1000, 28),
  (200, 300, '2 gånger/månad', 1000, 26),

  (300, 500, '1 gång/vecka', 1000, 19),
  (300, 500, '2 gånger/vecka', 1000, 17),
  (300, 500, 'Varje dag', 1000, 15),
  (300, 500, '1 gång/månad', 1000, 24),
  (300, 500, '2 gånger/månad', 1000, 22),

  (500, 1000, '1 gång/vecka', 1000, 16),
  (500, 1000, '2 gånger/vecka', 1000, 14),
  (500, 1000, 'Varje dag', 1000, 12),
  (500, 1000, '1 gång/månad', 1000, 21),
  (500, 1000, '2 gånger/månad', 1000, 19)
on conflict (sqm_from, sqm_to, "städ_frekvens") do update
set
  base_fee = excluded.base_fee,
  price_per_sqm = excluded.price_per_sqm;
