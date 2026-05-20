-- auto = beräknad av kalkylatorn, manuell = kräver manuell offert

alter table public."offert_förfrågan"
  add column if not exists status text;

update public."offert_förfrågan" o
set status = case
  when exists (
    select 1
    from public.kund_offert ko
    where ko.offert_forfragan_id = o.id
  ) then 'auto'
  else 'manuell'
end
where status is null;

alter table public."offert_förfrågan"
  alter column status set not null;

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_status_check;

alter table public."offert_förfrågan"
  add constraint offert_forfragan_status_check
  check (status in ('auto', 'manuell'));

create index if not exists offert_forfragan_status_idx
  on public."offert_förfrågan" (status);

comment on column public."offert_förfrågan".status is
  'auto = kalkylatorn räknade offert, manuell = förfrågan väntar på manuell hantering';
