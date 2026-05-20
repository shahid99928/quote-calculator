-- Revert 20260521110000: restore pris_id order from before reorder (lägenhet 7 rows last).

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
  case
    when boendetyp = 'lägenhet' and antal_rum = 7 then 99
    when boendetyp = 'lägenhet' then 1
    when boendetyp = 'radhus' then 2
    when boendetyp = 'villa' then 3
    else 98
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
