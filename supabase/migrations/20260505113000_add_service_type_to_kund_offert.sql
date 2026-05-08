alter table public.kund_offert
  add column if not exists service_type text;

update public.kund_offert ko
set service_type = r.service_type
from public."offert_förfrågan" r
where r.id = ko.id
  and ko.service_type is null;
