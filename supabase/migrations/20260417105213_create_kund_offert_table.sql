create table if not exists public.kund_offert (
  id bigint generated always as identity primary key,
  offert numeric(12,2) not null check (offert >= 0),
  city text not null,
  phone text not null,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.kund_offert enable row level security;
