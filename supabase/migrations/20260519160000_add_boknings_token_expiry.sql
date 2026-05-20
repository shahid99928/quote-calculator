-- Booking links expire; limits damage if a token is forwarded or leaked.

alter table public.kund_offert
  add column if not exists boknings_token_galler_till timestamptz;

update public.kund_offert
set boknings_token_galler_till = skapad + interval '90 days'
where boknings_token_galler_till is null;

alter table public.kund_offert
  alter column boknings_token_galler_till set not null;

alter table public.kund_offert
  alter column boknings_token_galler_till set default (now() + interval '90 days');
