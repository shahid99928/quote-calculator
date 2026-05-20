-- Restore lägenhet 7 rum rows (if missing) and group pris_id: lägenhet 1–7, then radhus, then villa.

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

create temp table _bostads_priser_backup on commit drop as
select
  boendetyp,
  antal_rum,
  kvm_fran,
  kvm_till,
  grundavgift,
  pris_per_kvm,
  stadfrekvens,
  tjanst_typ
from public.bostads_priser;

truncate table public.bostads_priser restart identity;

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
  boendetyp,
  antal_rum,
  kvm_fran,
  kvm_till,
  grundavgift,
  pris_per_kvm,
  stadfrekvens,
  tjanst_typ
from _bostads_priser_backup
order by
  case boendetyp
    when 'lägenhet' then 1
    when 'radhus' then 2
    when 'villa' then 3
    else 99
  end,
  antal_rum,
  case tjanst_typ
    when 'Flyttstadning' then 1
    when 'Storstadning' then 2
    when 'Byggstadning' then 3
    when 'Visningsstadning' then 4
    when 'Hemstadning' then 5
    else 99
  end,
  case stadfrekvens
    when 'Engångsstädning' then 1
    when '1 gång/vecka' then 2
    when '2 gånger/vecka' then 3
    when 'Varje dag' then 4
    when '1 gång/månad' then 5
    when '2 gånger/månad' then 6
    else 99
  end;
