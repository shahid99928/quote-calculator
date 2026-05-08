begin;

alter table public.kund_offert rename to kund_offert_old;

create table public.kund_offert (
  id bigint generated always as identity primary key,
  service_type text,
  offert numeric(12,2) not null check (offert >= 0),
  city text not null,
  phone text not null,
  email text not null,
  created_at timestamptz not null default now()
);

insert into public.kund_offert (id, service_type, offert, city, phone, email, created_at)
overriding system value
select id, service_type, offert, city, phone, email, created_at
from public.kund_offert_old
order by id;

select setval(
  pg_get_serial_sequence('public.kund_offert', 'id'),
  coalesce((select max(id) from public.kund_offert), 1),
  true
);

alter table public.kund_offert enable row level security;

drop table public.kund_offert_old;

commit;
