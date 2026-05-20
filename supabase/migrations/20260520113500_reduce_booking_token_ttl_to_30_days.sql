-- Reduce booking-link validity from 90 days to 30 days.

alter table public.kund_offert
  alter column boknings_token_galler_till set default (now() + interval '30 days');

-- Clamp existing rows so no token remains valid longer than 30 days from quote creation.
update public.kund_offert
set boknings_token_galler_till = least(boknings_token_galler_till, skapad + interval '30 days');
