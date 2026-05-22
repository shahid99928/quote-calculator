-- Rate limit events for calculate-offer (e.g. max 10 quotes per hour per IP and per email).

create table if not exists public.offer_rate_limit_events (
  id bigint generated always as identity primary key,
  client_ip text not null,
  email_normalized text not null,
  created_at timestamptz not null default now()
);

create index if not exists offer_rate_limit_events_ip_created_at_idx
  on public.offer_rate_limit_events (client_ip, created_at desc);

create index if not exists offer_rate_limit_events_email_created_at_idx
  on public.offer_rate_limit_events (email_normalized, created_at desc);

alter table public.offer_rate_limit_events enable row level security;

revoke all on table public.offer_rate_limit_events from anon;
revoke all on table public.offer_rate_limit_events from authenticated;
