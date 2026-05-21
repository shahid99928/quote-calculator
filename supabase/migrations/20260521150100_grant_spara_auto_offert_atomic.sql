do $grant$
begin
  revoke all on function public.spara_auto_offert_atomic(jsonb, jsonb) from public;
  revoke all on function public.spara_auto_offert_atomic(jsonb, jsonb) from anon;
  revoke all on function public.spara_auto_offert_atomic(jsonb, jsonb) from authenticated;
  grant execute on function public.spara_auto_offert_atomic(jsonb, jsonb) to service_role;
end;
$grant$;
