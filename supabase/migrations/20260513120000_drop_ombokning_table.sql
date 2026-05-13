-- Remove public.ombokning if it exists (e.g. after a prior manual or remote-only migration).
drop table if exists public.ombokning cascade;
