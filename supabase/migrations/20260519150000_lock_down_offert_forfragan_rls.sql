-- Remove public anon/authenticated access to offert_förfrågan (PII).
-- Edge functions use service_role, which bypasses RLS.

alter table public."offert_förfrågan" enable row level security;

drop policy if exists "Allow anon insert price_requests" on public."offert_förfrågan";
drop policy if exists "Allow anon select price_requests" on public."offert_förfrågan";

revoke all on table public."offert_förfrågan" from anon;
revoke all on table public."offert_förfrågan" from authenticated;
