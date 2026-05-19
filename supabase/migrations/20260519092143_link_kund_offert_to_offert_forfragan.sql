-- Applied remotely via Supabase MCP; kept in repo so migration history matches.

alter table public.kund_offert
  add column if not exists offert_forfragan_id bigint references public."offert_förfrågan"(id) on delete set null;

create index if not exists kund_offert_offert_forfragan_id_idx
  on public.kund_offert (offert_forfragan_id);
