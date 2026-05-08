alter table public."offert_förfrågan"
  add column if not exists "städ_frekvens" text;

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_stad_frekvens_check;

alter table public."offert_förfrågan"
  add constraint offert_forfragan_stad_frekvens_check
  check (
    (
      translate(lower(service_type), 'åäö', 'aao') = 'foretagsstadning'
      and "städ_frekvens" in (
        '1 gång/vecka',
        '2 gånger/vecka',
        'Varje dag',
        '1 gång/månad',
        '2 gånger/månad'
      )
    )
    or
    (
      translate(lower(service_type), 'åäö', 'aao') <> 'foretagsstadning'
      and "städ_frekvens" is null
    )
  );
