-- 18 boyta-brickor (lägenhet 1–6 rum, radhus 1–7, villa 3–7) som mall från Hemstädning Engångsstädning.
-- Lägger till samma 18 för Flytt-/Stor-/Bygg-/Visningsstädning med stadfrekvens Engångsstädning
-- och skilda priser (skalning enligt seed-proportioner: 10/7, 9/7, 19/14, 17/14 mot mallraden).

delete from public.bostads_priser
where tjanst_typ in ('Flyttstadning', 'Storstadning', 'Byggstadning', 'Visningsstadning')
  and stadfrekvens = 'Engångsstädning';

with hem_template (
  boendetyp,
  antal_rum,
  kvm_fran,
  kvm_till,
  grundavgift,
  pris_per_kvm
) as (
  values
    ('lägenhet'::text, 1, 20::numeric, 44::numeric, 1020::numeric, 30.60::numeric),
    ('lägenhet', 2, 45, 64, 1200, 31.80),
    ('lägenhet', 3, 65, 84, 1440, 33.00),
    ('lägenhet', 4, 85, 104, 1740, 34.20),
    ('lägenhet', 5, 105, 124, 2040, 35.40),
    ('lägenhet', 6, 125, 150, 2340, 36.60),
    ('radhus', 1, 30, 59, 1920, 37.20),
    ('radhus', 2, 60, 89, 2040, 38.40),
    ('radhus', 3, 90, 119, 2160, 39.60),
    ('radhus', 4, 120, 149, 2340, 40.80),
    ('radhus', 5, 150, 179, 2520, 42.00),
    ('radhus', 6, 180, 209, 2700, 43.20),
    ('radhus', 7, 210, 250, 2880, 44.40),
    ('villa', 3, 90, 129, 2760, 48.00),
    ('villa', 4, 130, 169, 3000, 49.80),
    ('villa', 5, 170, 209, 3240, 51.60),
    ('villa', 6, 210, 259, 3540, 53.40),
    ('villa', 7, 260, 320, 3840, 55.20)
),
services (tjanst_typ, faktor) as (
  values
    ('Flyttstadning'::text, (10.0 / 7.0)::numeric),
    ('Storstadning'::text, (9.0 / 7.0)::numeric),
    ('Byggstadning'::text, (19.0 / 14.0)::numeric),
    ('Visningsstadning'::text, (17.0 / 14.0)::numeric)
)
insert into public.bostads_priser (
  boendetyp,
  antal_rum,
  kvm_fran,
  kvm_till,
  grundavgift,
  pris_per_kvm,
  stadfrekvens,
  tjanst_typ
)
select
  h.boendetyp,
  h.antal_rum,
  h.kvm_fran,
  h.kvm_till,
  round((h.grundavgift * s.faktor)::numeric, 2),
  round((h.pris_per_kvm * s.faktor)::numeric, 2),
  'Engångsstädning',
  s.tjanst_typ
from hem_template h
cross join services s;
