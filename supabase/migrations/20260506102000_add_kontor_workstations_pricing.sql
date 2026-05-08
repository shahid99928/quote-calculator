alter table public."offert_förfrågan"
  add column if not exists antal_arbetsplatser integer;

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_antal_arbetsplatser_check;

alter table public."offert_förfrågan"
  add constraint offert_forfragan_antal_arbetsplatser_check
  check (
    (
      translate(lower(service_type), 'åäö', 'aao') = 'kontorstadning'
      and antal_arbetsplatser is not null
      and antal_arbetsplatser > 0
    )
    or
    (
      translate(lower(service_type), 'åäö', 'aao') <> 'kontorstadning'
      and antal_arbetsplatser is null
    )
  ) not valid;

create table if not exists public.kontors_arbetsplats_priser (
  price_id bigint generated always as identity primary key,
  workstations_from integer not null check (workstations_from > 0),
  workstations_to integer not null check (workstations_to >= workstations_from),
  monthly_addon_per_workstation numeric(10,2) not null check (monthly_addon_per_workstation >= 0),
  constraint kontors_arbetsplats_priser_range_unique unique (workstations_from, workstations_to)
);

alter table public.kontors_arbetsplats_priser enable row level security;

drop policy if exists "Allow public read access on kontors_arbetsplats_priser"
  on public.kontors_arbetsplats_priser;
create policy "Allow public read access on kontors_arbetsplats_priser"
  on public.kontors_arbetsplats_priser
  for select
  using (true);

insert into public.kontors_arbetsplats_priser (workstations_from, workstations_to, monthly_addon_per_workstation)
values
  (1, 10, 75.00),
  (11, 25, 68.00),
  (26, 50, 62.00),
  (51, 100, 56.00),
  (101, 300, 49.00)
on conflict (workstations_from, workstations_to)
do update set monthly_addon_per_workstation = excluded.monthly_addon_per_workstation;
