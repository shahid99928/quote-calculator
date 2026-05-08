alter table public.kund_offert
  add column if not exists booking_token text;

update public.kund_offert
set booking_token = md5(id::text || clock_timestamp()::text || random()::text)
where booking_token is null;

alter table public.kund_offert
  alter column booking_token set not null;

alter table public.kund_offert
  drop constraint if exists kund_offert_booking_token_unique;

alter table public.kund_offert
  add constraint kund_offert_booking_token_unique unique (booking_token);

create table if not exists public.kund_bokningar (
  booking_id bigint generated always as identity primary key,
  kund_offert_id bigint not null references public.kund_offert(id) on delete cascade,
  requested_date date not null,
  accepted_offer boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kund_bokningar_kund_offert_unique unique (kund_offert_id)
);

alter table public.kund_bokningar enable row level security;
