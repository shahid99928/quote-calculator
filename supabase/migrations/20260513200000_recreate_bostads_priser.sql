-- Återskapar public.bostads_priser (kolumner som tidigare: pris_id, boendetyp, antal_rum,
-- kvm_fran, kvm_till, grundavgift, pris_per_kvm, stadfrekvens, tjanst_typ).
-- tjanst_typ-värden som i appen: Flyttstadning, Visningsstadning, Storstadning, Byggstadning, Hemstadning.
-- Infogning: först fyra tjänster (endast Engångsstädning), sedan Hemstädning med alla sex frekvenser.
-- Boyta/rum/grundavgift + Hem pris_per_kvm från samma 18-raders engångsmall som tidigare.
-- pris_per_kvm för de fyra första tjänsterna: egna fasta värden per bricka (inte kopierade från Hem).

drop table if exists public.bostads_priser cascade;

create table public.bostads_priser (
  pris_id bigint generated always as identity primary key,
  boendetyp text not null,
  antal_rum integer not null,
  kvm_fran numeric not null,
  kvm_till numeric not null,
  grundavgift numeric not null default 0,
  pris_per_kvm numeric not null default 0,
  stadfrekvens text not null,
  tjanst_typ text not null,
  constraint bostads_priser_boendetyp_check check (
    boendetyp in ('lägenhet', 'radhus', 'villa')
  ),
  constraint bostads_priser_antal_rum check (antal_rum > 0),
  constraint bostads_priser_kvm_fran check (kvm_fran >= 0),
  constraint bostads_priser_kvm_till check (kvm_till >= kvm_fran),
  constraint bostads_priser_grundavgift check (grundavgift >= 0),
  constraint bostads_priser_pris_per_kvm check (pris_per_kvm >= 0),
  constraint bostads_priser_tjanst_typ_check check (
    tjanst_typ in (
      'Hemstadning',
      'Flyttstadning',
      'Storstadning',
      'Byggstadning',
      'Visningsstadning'
    )
  ),
  constraint bostads_priser_tjanst_stadfrekvens_check check (
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
  )
);

alter table public.bostads_priser enable row level security;

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
  values
    ('lägenhet'::text, 1, 20::numeric, 44::numeric, 1020::numeric, 30.60::numeric, 34.20::numeric, 27.50::numeric, 32.10::numeric, 29.30::numeric),
    ('lägenhet', 2, 45, 64, 1200, 31.80, 35.60, 28.90, 33.40, 30.50),
    ('lägenhet', 3, 65, 84, 1440, 33.00, 36.80, 30.20, 34.90, 31.70),
    ('lägenhet', 4, 85, 104, 1740, 34.20, 38.10, 31.40, 36.20, 33.00),
    ('lägenhet', 5, 105, 124, 2040, 35.40, 39.50, 32.60, 37.50, 34.20),
    ('lägenhet', 6, 125, 150, 2340, 36.60, 41.00, 33.80, 38.90, 35.40),
    ('radhus', 1, 30, 59, 1920, 37.20, 41.00, 34.10, 38.60, 35.80),
    ('radhus', 2, 60, 89, 2040, 38.40, 42.20, 35.30, 39.80, 37.00),
    ('radhus', 3, 90, 119, 2160, 39.60, 43.50, 36.20, 41.00, 38.10),
    ('radhus', 4, 120, 149, 2340, 40.80, 44.70, 37.40, 42.30, 39.30),
    ('radhus', 5, 150, 179, 2520, 42.00, 46.10, 38.50, 43.80, 40.50),
    ('radhus', 6, 180, 209, 2700, 43.20, 47.30, 39.70, 45.00, 41.70),
    ('radhus', 7, 210, 250, 2880, 44.40, 48.60, 40.90, 46.30, 42.90),
    ('villa', 3, 90, 129, 2760, 48.00, 52.50, 44.20, 50.10, 46.30),
    ('villa', 4, 130, 169, 3000, 49.80, 54.40, 45.90, 51.80, 48.00),
    ('villa', 5, 170, 209, 3240, 51.60, 56.20, 47.30, 53.60, 49.70),
    ('villa', 6, 210, 259, 3540, 53.40, 58.10, 49.00, 55.40, 51.50),
    ('villa', 7, 260, 320, 3840, 55.20, 60.00, 50.60, 57.30, 53.20)
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
