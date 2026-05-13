-- Repair migration: restore missing non-home housing service rows in bostads_priser.
-- Safe to run multiple times (idempotent).

alter table public.bostads_priser
  drop constraint if exists bostads_priser_service_type_check;

alter table public.bostads_priser
  add constraint bostads_priser_service_type_check
  check (
    tjanst_typ in (
      'Hemstadning',
      'Flyttstadning',
      'Storstadning',
      'Byggstadning',
      'Visningsstadning'
    )
  );

alter table public.bostads_priser
  drop constraint if exists bostads_priser_service_type_stadfrekvens_check;

alter table public.bostads_priser
  add constraint bostads_priser_service_type_stadfrekvens_check
  check (
    (
      tjanst_typ = 'Hemstadning'
      and stadfrekvens in (
        'Engångsstädning',
        '1 gång/vecka',
        '2 gånger/vecka',
        'Varje dag',
        '1 gång/månad',
        '2 gånger/månad'
      )
    )
    or
    (
      tjanst_typ in (
        'Flyttstadning',
        'Storstadning',
        'Byggstadning',
        'Visningsstadning'
      )
      and stadfrekvens = 'Engångsstädning'
    )
  );

with hem_bas as (
  -- Pick one representative Hemstadning row per size bucket.
  -- Prioritize monthly rows first for stable pricing source.
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
  'Engångsstädning' as stadfrekvens,
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
