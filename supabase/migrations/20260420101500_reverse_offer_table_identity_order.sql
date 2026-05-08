do $$
declare
  table_name text;
  sequence_name text;
  next_identity_value bigint;
begin
  foreach table_name in array array['public.kund_offert', 'public."offert_förfrågan"']
  loop
    if to_regclass(table_name) is null then
      continue;
    end if;

    execute format('lock table %s in access exclusive mode', table_name);
    execute format('alter table %s alter column id drop identity if exists', table_name);

    execute format('update %s set id = -id where id > 0', table_name);

    execute format('alter table %s alter column id add generated always as identity', table_name);

    execute format(
      'select pg_get_serial_sequence(%L, %L)',
      table_name,
      'id'
    )
    into sequence_name;

    if sequence_name is null then
      continue;
    end if;

    execute format(
      'alter sequence %s increment by -1 minvalue -9223372036854775808 maxvalue 9223372036854775807 no cycle',
      sequence_name
    );

    execute format('select coalesce(min(id), 0) - 1 from %s', table_name)
    into next_identity_value;

    execute format(
      'alter table %s alter column id restart with %s',
      table_name,
      next_identity_value
    );
  end loop;
end
$$;
