alter table public."offert_förfrågan"
  add column if not exists typ_av_lokal text;

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_stad_frekvens_check;

alter table public."offert_förfrågan"
  add constraint offert_forfragan_stad_frekvens_check
  check (
    (
      translate(lower(service_type), 'åäö', 'aao') in ('foretagsstadning', 'kontorstadning', 'butikstadning', 'industristadning')
      and "städ_frekvens" in (
        'Engångsstädning',
        '1 gång/vecka',
        '2 gånger/vecka',
        'Varje dag',
        '1 gång/månad',
        '2 gånger/månad'
      )
    )
    or
    (
      translate(lower(service_type), 'åäö', 'aao') not in ('foretagsstadning', 'kontorstadning', 'butikstadning', 'industristadning')
      and "städ_frekvens" is null
    )
  ) not valid;

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_typ_av_lokal_check;

alter table public."offert_förfrågan"
  add constraint offert_forfragan_typ_av_lokal_check
  check (
    typ_av_lokal is null or typ_av_lokal in ('Kontor', 'Butik', 'Industri')
  ) not valid;

update public."offert_förfrågan"
set
  typ_av_lokal = coalesce(typ_av_lokal, 'Kontor'),
  service_type = case coalesce(typ_av_lokal, 'Kontor')
    when 'Kontor' then 'kontorstädning'
    when 'Butik' then 'butikstädning'
    when 'Industri' then 'industristädning'
    else service_type
  end
where translate(lower(service_type), 'åäö', 'aao') = 'foretagsstadning';

update public.kund_offert k
set service_type = case coalesce(r.typ_av_lokal, 'Kontor')
  when 'Kontor' then 'kontorstädning'
  when 'Butik' then 'butikstädning'
  when 'Industri' then 'industristädning'
  else k.service_type
end
from public."offert_förfrågan" r
where r.id = k.id
  and translate(lower(k.service_type), 'åäö', 'aao') = 'foretagsstadning';
