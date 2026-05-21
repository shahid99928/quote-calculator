-- Remove public anon/authenticated access to kund_offert and kund_bokningar (PII, booking tokens).
-- Edge functions use service_role, which bypasses RLS.
-- Mirrors 20260519150000_lock_down_offert_forfragan_rls.sql.

alter table public.kund_offert enable row level security;

drop policy if exists "Allow anon insert kund_offert" on public.kund_offert;
drop policy if exists "Allow anon select kund_offert" on public.kund_offert;
drop policy if exists "Allow anon update kund_offert" on public.kund_offert;
drop policy if exists "Allow anon delete kund_offert" on public.kund_offert;

revoke all on table public.kund_offert from anon;
revoke all on table public.kund_offert from authenticated;

alter table public.kund_bokningar enable row level security;

drop policy if exists "Allow anon insert kund_bokningar" on public.kund_bokningar;
drop policy if exists "Allow anon select kund_bokningar" on public.kund_bokningar;
drop policy if exists "Allow anon update kund_bokningar" on public.kund_bokningar;
drop policy if exists "Allow anon delete kund_bokningar" on public.kund_bokningar;

revoke all on table public.kund_bokningar from anon;
revoke all on table public.kund_bokningar from authenticated;
