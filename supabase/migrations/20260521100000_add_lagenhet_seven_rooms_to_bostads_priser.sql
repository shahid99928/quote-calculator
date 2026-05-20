-- Lägenhet: 7 rum i prislistan (samma tjänster/frekvenser som övriga rum-brickor).
-- Prisbricka följer steg lägenhet 6→7 (samma kvm/grund/pris-steg som 5→6) och kvm_till 200.

delete from public.bostads_priser
where boendetyp = 'lägenhet'
  and antal_rum = 7;

with brick (
  boendetyp,
  antal_rum,
  kvm_fran,
  kvm_till,
  grund,
  pris_hem_eng,
  pris_flytt,
  pris_stor,
  pris_bygg,
  pris_visning
) as (
  values (
    'lägenhet'::text,
    7,
    151::numeric,
    200::numeric,
    2640::numeric,
    37.80::numeric,
    42.20::numeric,
    35.00::numeric,
    40.10::numeric,
    36.60::numeric
  )
),
hem_frekvens (stadfrekvens, faktor) as (
  values
    ('Engångsstädning'::text, 1.20::numeric),
    ('1 gång/vecka'::text, 0.82::numeric),
    ('2 gånger/vecka'::text, 0.72::numeric),
    ('Varje dag'::text, 0.62::numeric),
    ('1 gång/månad'::text, 1.00::numeric),
    ('2 gånger/månad'::text, 0.90::numeric)
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
select b.boendetyp, b.antal_rum, b.kvm_fran, b.kvm_till, b.grund, b.pris_flytt, 'Engångsstädning', 'Flyttstadning'
from brick b
union all
select b.boendetyp, b.antal_rum, b.kvm_fran, b.kvm_till, b.grund, b.pris_stor, 'Engångsstädning', 'Storstadning'
from brick b
union all
select b.boendetyp, b.antal_rum, b.kvm_fran, b.kvm_till, b.grund, b.pris_bygg, 'Engångsstädning', 'Byggstadning'
from brick b
union all
select b.boendetyp, b.antal_rum, b.kvm_fran, b.kvm_till, b.grund, b.pris_visning, 'Engångsstädning', 'Visningsstadning'
from brick b
union all
select
  b.boendetyp,
  b.antal_rum,
  b.kvm_fran,
  b.kvm_till,
  round((b.grund * (h.faktor / 1.20))::numeric, 2),
  round((b.pris_hem_eng * (h.faktor / 1.20))::numeric, 2),
  h.stadfrekvens,
  'Hemstadning'
from brick b
cross join hem_frekvens h;
