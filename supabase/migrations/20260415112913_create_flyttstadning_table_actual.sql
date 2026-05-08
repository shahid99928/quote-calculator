create table if not exists public.flyttstadning (
  id bigint generated always as identity primary key,
  kvm numeric(7,2) not null check (kvm > 0),
  objekt_typ text not null check (objekt_typ in ('lägenhet', 'villa', 'radhus')),
  antal_rum integer not null check (antal_rum > 0),
  created_at timestamptz not null default now()
);
