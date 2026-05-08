drop extension if exists "pg_net";

do $$
begin
  if to_regclass('public.flyttstadning') is not null then
    execute 'revoke delete on table "public"."flyttstadning" from "anon"';
    execute 'revoke insert on table "public"."flyttstadning" from "anon"';
    execute 'revoke references on table "public"."flyttstadning" from "anon"';
    execute 'revoke select on table "public"."flyttstadning" from "anon"';
    execute 'revoke trigger on table "public"."flyttstadning" from "anon"';
    execute 'revoke truncate on table "public"."flyttstadning" from "anon"';
    execute 'revoke update on table "public"."flyttstadning" from "anon"';
    execute 'revoke delete on table "public"."flyttstadning" from "authenticated"';
    execute 'revoke insert on table "public"."flyttstadning" from "authenticated"';
    execute 'revoke references on table "public"."flyttstadning" from "authenticated"';
    execute 'revoke select on table "public"."flyttstadning" from "authenticated"';
    execute 'revoke trigger on table "public"."flyttstadning" from "authenticated"';
    execute 'revoke truncate on table "public"."flyttstadning" from "authenticated"';
    execute 'revoke update on table "public"."flyttstadning" from "authenticated"';
    execute 'revoke delete on table "public"."flyttstadning" from "service_role"';
    execute 'revoke insert on table "public"."flyttstadning" from "service_role"';
    execute 'revoke references on table "public"."flyttstadning" from "service_role"';
    execute 'revoke select on table "public"."flyttstadning" from "service_role"';
    execute 'revoke trigger on table "public"."flyttstadning" from "service_role"';
    execute 'revoke truncate on table "public"."flyttstadning" from "service_role"';
    execute 'revoke update on table "public"."flyttstadning" from "service_role"';

    alter table "public"."flyttstadning" drop constraint if exists "flyttstadning_antal_rum_check";
    alter table "public"."flyttstadning" drop constraint if exists "flyttstadning_kvm_check";
    alter table "public"."flyttstadning" drop constraint if exists "flyttstadning_objekt_typ_check";
    alter table "public"."flyttstadning" drop constraint if exists "flyttstadning_pkey";
    drop index if exists "public"."flyttstadning_pkey";
    drop table if exists "public"."flyttstadning";
  end if;
end $$;


  create table "public"."price_requests" (
    "id" bigint generated always as identity not null,
    "service_type" text not null,
    "square_meters" integer not null,
    "city" text not null,
    "phone" text not null,
    "email" text not null,
    "consent" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."price_requests" enable row level security;

CREATE UNIQUE INDEX price_requests_pkey ON public.price_requests USING btree (id);

alter table "public"."price_requests" add constraint "price_requests_pkey" PRIMARY KEY using index "price_requests_pkey";

alter table "public"."price_requests" add constraint "price_requests_square_meters_check" CHECK ((square_meters > 0)) not valid;

alter table "public"."price_requests" validate constraint "price_requests_square_meters_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

grant delete on table "public"."price_requests" to "anon";

grant insert on table "public"."price_requests" to "anon";

grant references on table "public"."price_requests" to "anon";

grant select on table "public"."price_requests" to "anon";

grant trigger on table "public"."price_requests" to "anon";

grant truncate on table "public"."price_requests" to "anon";

grant update on table "public"."price_requests" to "anon";

grant delete on table "public"."price_requests" to "authenticated";

grant insert on table "public"."price_requests" to "authenticated";

grant references on table "public"."price_requests" to "authenticated";

grant select on table "public"."price_requests" to "authenticated";

grant trigger on table "public"."price_requests" to "authenticated";

grant truncate on table "public"."price_requests" to "authenticated";

grant update on table "public"."price_requests" to "authenticated";

grant delete on table "public"."price_requests" to "service_role";

grant insert on table "public"."price_requests" to "service_role";

grant references on table "public"."price_requests" to "service_role";

grant select on table "public"."price_requests" to "service_role";

grant trigger on table "public"."price_requests" to "service_role";

grant truncate on table "public"."price_requests" to "service_role";

grant update on table "public"."price_requests" to "service_role";


  create policy "Allow anon insert price_requests"
  on "public"."price_requests"
  as permissive
  for insert
  to anon
with check (true);



  create policy "Allow anon select price_requests"
  on "public"."price_requests"
  as permissive
  for select
  to anon
using (true);



