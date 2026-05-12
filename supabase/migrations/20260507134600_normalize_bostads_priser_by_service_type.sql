alter table public.bostads_priser
  add column if not exists service_type text;

update public.bostads_priser
set service_type = 'Hemstadning'
where "städ_frekvens" is not null;

alter table public.bostads_priser
  drop constraint if exists bostads_priser_service_type_check;

alter table public.bostads_priser
  add constraint bostads_priser_service_type_check
  check (
    service_type is null
    or service_type in (
      'Hemstadning'
    )
  );

alter table public.bostads_priser
  drop constraint if exists bostads_priser_service_type_stadfrekvens_check;

alter table public.bostads_priser
  add constraint bostads_priser_service_type_stadfrekvens_check
  check (
    (
      service_type = 'Hemstadning'
      and "städ_frekvens" is not null
    )
    or
    (
      service_type is null
      and "städ_frekvens" is null
    )
  );
