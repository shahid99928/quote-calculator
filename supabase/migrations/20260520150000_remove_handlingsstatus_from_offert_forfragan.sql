-- Revert handlingsstatus feature (column, view, index).

drop view if exists public.v_offertforfragan_oversikt;

drop index if exists public.offert_forfragan_handlingsstatus_idx;

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_handlingsstatus_check;

alter table public."offert_förfrågan"
  drop column if exists handlingsstatus;
