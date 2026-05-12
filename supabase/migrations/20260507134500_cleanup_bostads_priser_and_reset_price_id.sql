do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bostads_priser'
      and column_name = 'service_type'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bostads_priser'
      and column_name = 'städ_frekvens'
  ) then
    delete from public.bostads_priser
    where service_type is null
       or "städ_frekvens" is null;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bostads_priser'
      and column_name = 'städ_frekvens'
  ) then
    delete from public.bostads_priser
    where "städ_frekvens" is null;
  end if;
end
$$;

alter table public.bostads_priser
  alter column price_id drop identity if exists;

with ordered_rows as (
  select price_id, row_number() over (order by price_id) as new_id
  from public.bostads_priser
)
update public.bostads_priser b
set price_id = -o.new_id
from ordered_rows o
where b.price_id = o.price_id;

update public.bostads_priser
set price_id = -price_id;

alter table public.bostads_priser
  alter column price_id add generated always as identity;

select setval(
  pg_get_serial_sequence('public.bostads_priser', 'price_id'),
  coalesce((select max(price_id) from public.bostads_priser), 0) + 1,
  false
);
