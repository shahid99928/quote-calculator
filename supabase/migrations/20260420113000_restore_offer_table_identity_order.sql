do $$
declare
  tbl text;
  seq_name text;
  next_identity_value bigint;
begin
  foreach tbl in array array['public.kund_offert', 'public."offert_förfrågan"']
  loop
    if to_regclass(tbl) is null then
      continue;
    end if;

    execute format('lock table %s in access exclusive mode', tbl);

    execute format(
      'select pg_get_serial_sequence(%L, %L)',
      tbl,
      'id'
    ) into seq_name;

    execute format('alter table %s alter column id drop identity if exists', tbl);

    execute format(
      'with ordered as (
         select ctid, row_number() over (order by created_at asc, id asc) as new_id
         from %s
       )
       update %s t
       set id = ordered.new_id
       from ordered
       where t.ctid = ordered.ctid',
      tbl,
      tbl
    );

    execute format('alter table %s alter column id add generated always as identity', tbl);

    execute format(
      'select pg_get_serial_sequence(%L, %L)',
      tbl,
      'id'
    ) into seq_name;

    if seq_name is not null then
      execute format('select coalesce(max(id), 0) + 1 from %s', tbl)
      into next_identity_value;

      execute format(
        'alter sequence %s increment by 1 minvalue 1 no maxvalue restart with %s',
        seq_name,
        next_identity_value
      );
    end if;
  end loop;
end
$$;
