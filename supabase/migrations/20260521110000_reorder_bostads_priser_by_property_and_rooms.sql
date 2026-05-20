-- Table Editor sorts by pris_id by default. Reassign IDs so rows group logically:
-- lägenhet (rum 1..7) → radhus (1..7) → villa (3..7), then tjänst and stadfrekvens.
-- Reverted in production by 20260521120000_revert_bostads_priser_reorder.sql.

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
