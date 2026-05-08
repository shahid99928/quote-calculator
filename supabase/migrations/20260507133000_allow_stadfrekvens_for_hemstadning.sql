alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_stad_frekvens_check;

alter table public."offert_förfrågan"
  add constraint offert_forfragan_stad_frekvens_check
  check (
    (
      (
        translate(lower(service_type), 'åäö', 'aao') in (
          'foretagsstadning',
          'kontorstadning',
          'butikstadning',
          'industristadning',
          'hemstadning'
        )
      )
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
      translate(lower(service_type), 'åäö', 'aao') not in (
        'foretagsstadning',
        'kontorstadning',
        'butikstadning',
        'industristadning',
        'hemstadning'
      )
      and "städ_frekvens" is null
    )
  ) not valid;
