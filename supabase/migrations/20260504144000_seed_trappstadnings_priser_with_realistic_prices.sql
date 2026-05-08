alter table public."trappstädnings_priser"
  add column if not exists pris numeric(10,2);

alter table public."trappstädnings_priser"
  alter column pris set default 0;

update public."trappstädnings_priser"
set pris = 0
where pris is null;

alter table public."trappstädnings_priser"
  alter column pris set not null;

alter table public."trappstädnings_priser"
  drop constraint if exists trappstadnings_priser_pris_check;

alter table public."trappstädnings_priser"
  add constraint trappstadnings_priser_pris_check
  check (pris >= 0);

alter table public."trappstädnings_priser"
  drop constraint if exists trappstadnings_priser_unique_ranges_frequency;

alter table public."trappstädnings_priser"
  add constraint trappstadnings_priser_unique_ranges_frequency unique (
    sqm_from,
    sqm_to,
    antal_trapphus_from,
    antal_trapphus_to,
    "antal_våningar_from",
    "antal_våningar_to",
    "antal_hissar_from",
    "antal_hissar_to",
    "städfrekvens"
  );

with sqm_ranges as (
  select * from (
    values
      (50, 150, 1800::numeric),
      (151, 300, 2800::numeric),
      (301, 500, 4200::numeric)
  ) as t(sqm_from, sqm_to, base_price)
),
trapphus_ranges as (
  select * from (
    values
      (1, 2, 0::numeric),
      (3, 5, 900::numeric),
      (6, 10, 2200::numeric)
  ) as t(antal_trapphus_from, antal_trapphus_to, trapphus_add)
),
vaning_ranges as (
  select * from (
    values
      (2, 3, 0::numeric),
      (4, 6, 700::numeric),
      (7, 10, 1600::numeric)
  ) as t("antal_våningar_from", "antal_våningar_to", vaning_add)
),
hiss_ranges as (
  select * from (
    values
      (0, 0, 600::numeric),
      (1, 2, 200::numeric),
      (3, 6, 0::numeric)
  ) as t("antal_hissar_from", "antal_hissar_to", hiss_add)
),
freq_ranges as (
  select * from (
    values
      ('1 gång/vecka'::text, 0.85::numeric),
      ('Varannan vecka'::text, 1.00::numeric),
      ('1 gång/månad'::text, 1.20::numeric)
  ) as t("städfrekvens", freq_multiplier)
),
price_grid as (
  select
    s.sqm_from,
    s.sqm_to,
    t.antal_trapphus_from,
    t.antal_trapphus_to,
    v."antal_våningar_from",
    v."antal_våningar_to",
    h."antal_hissar_from",
    h."antal_hissar_to",
    f."städfrekvens",
    round(((s.base_price + t.trapphus_add + v.vaning_add + h.hiss_add) * f.freq_multiplier)::numeric, 2) as pris
  from sqm_ranges s
  cross join trapphus_ranges t
  cross join vaning_ranges v
  cross join hiss_ranges h
  cross join freq_ranges f
)
insert into public."trappstädnings_priser" (
  sqm_from,
  sqm_to,
  antal_trapphus_from,
  antal_trapphus_to,
  "antal_våningar_from",
  "antal_våningar_to",
  "antal_hissar_from",
  "antal_hissar_to",
  "städfrekvens",
  pris
)
select
  sqm_from,
  sqm_to,
  antal_trapphus_from,
  antal_trapphus_to,
  "antal_våningar_from",
  "antal_våningar_to",
  "antal_hissar_from",
  "antal_hissar_to",
  "städfrekvens",
  pris
from price_grid
on conflict (
  sqm_from,
  sqm_to,
  antal_trapphus_from,
  antal_trapphus_to,
  "antal_våningar_from",
  "antal_våningar_to",
  "antal_hissar_from",
  "antal_hissar_to",
  "städfrekvens"
)
do update set
  pris = excluded.pris;
