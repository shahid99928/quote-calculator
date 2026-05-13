-- Revert data from 20260513143000_seed_non_home_priser_from_hem_engangs_template.sql:
-- remove scaled Engångsstädning rows for the four services, then repopulate like
-- repair_missing_housing_service_rows (copy Hemstädning "1 gång/månad" per bucket).

delete from public.bostads_priser
where tjanst_typ in ('Flyttstadning', 'Storstadning', 'Byggstadning', 'Visningsstadning')
  and stadfrekvens = 'Engångsstädning';

with hem_bas as (
  select distinct on (boendetyp, antal_rum, kvm_fran, kvm_till)
    boendetyp,
    antal_rum,
    kvm_fran,
    kvm_till,
    grundavgift,
    pris_per_kvm
  from public.bostads_priser
  where tjanst_typ = 'Hemstadning'
  order by
    boendetyp,
    antal_rum,
    kvm_fran,
    kvm_till,
    case stadfrekvens
      when '1 gång/månad' then 1
      when '2 gånger/månad' then 2
      when 'Engångsstädning' then 3
      when '1 gång/vecka' then 4
      when '2 gånger/vecka' then 5
      when 'Varje dag' then 6
      else 99
    end
),
target_services as (
  select 'Flyttstadning'::text as tjanst_typ
  union all select 'Storstadning'::text
  union all select 'Byggstadning'::text
  union all select 'Visningsstadning'::text
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
  b.boendetyp,
  b.antal_rum,
  b.kvm_fran,
  b.kvm_till,
  b.grundavgift,
  b.pris_per_kvm,
  'Engångsstädning',
  s.tjanst_typ
from hem_bas b
cross join target_services s
where not exists (
  select 1
  from public.bostads_priser e
  where e.boendetyp = b.boendetyp
    and e.antal_rum = b.antal_rum
    and e.kvm_fran = b.kvm_fran
    and e.kvm_till = b.kvm_till
    and e.stadfrekvens = 'Engångsstädning'
    and e.tjanst_typ = s.tjanst_typ
);
