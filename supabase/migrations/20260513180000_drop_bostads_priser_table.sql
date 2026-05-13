-- Remove housing price list; calculate-offer no longer reads this table.
drop table if exists public.bostads_priser cascade;
