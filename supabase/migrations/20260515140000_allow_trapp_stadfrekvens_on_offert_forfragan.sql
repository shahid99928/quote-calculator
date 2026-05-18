-- Trappstädning sparar stadfrekvens (Varannan vecka m.fl.) i offert_förfrågan.

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_stad_frekvens_check;

alter table public."offert_förfrågan"
  add constraint offert_forfragan_stad_frekvens_check
  check (
    (
      translate(lower(tjanst_typ), 'åäö', 'aao') in (
        'foretagsstadning',
        'kontorstadning',
        'butikstadning',
        'industristadning',
        'hemstadning'
      )
      and stadfrekvens in (
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
      translate(lower(tjanst_typ), 'åäö', 'aao') in ('trappstadning brfer')
      and stadfrekvens in (
        '1 gång/vecka',
        'Varannan vecka',
        '1 gång/månad'
      )
    )
    or
    (
      translate(lower(tjanst_typ), 'åäö', 'aao') not in (
        'foretagsstadning',
        'kontorstadning',
        'butikstadning',
        'industristadning',
        'hemstadning',
        'trappstadning brfer'
      )
      and stadfrekvens is null
    )
  );
