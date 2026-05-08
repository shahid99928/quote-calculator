do $$
begin
  if to_regclass('public.flyttstadningspriser') is not null
     and to_regclass('public.bostads_priser') is null then
    alter table public.flyttstadningspriser rename to bostads_priser;
  end if;

  if to_regclass('public.price_requests') is not null
     and to_regclass('public."offert_förfrågan"') is null then
    alter table public.price_requests rename to "offert_förfrågan";
  end if;
end $$;
