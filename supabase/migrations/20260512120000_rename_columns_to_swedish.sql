-- Swedish physical column names (ASCII identifiers; no quoting needed in SQL/JS).
-- API JSON field names from PostgREST follow these column names.
-- If `supabase db push` fails (remote migration history drift), run this file in the
-- Supabase Dashboard SQL editor against the target database before relying on updated edge functions.

-- offert_förfrågan
alter table public."offert_förfrågan" rename column service_type to tjanst_typ;
alter table public."offert_förfrågan" rename column square_meters to kvadratmeter;
alter table public."offert_förfrågan" rename column city to stad;
alter table public."offert_förfrågan" rename column phone to telefon;
alter table public."offert_förfrågan" rename column email to epost;
alter table public."offert_förfrågan" rename column consent to samtycke;
alter table public."offert_förfrågan" rename column created_at to skapad;
alter table public."offert_förfrågan" rename column property_type to boendetyp;
alter table public."offert_förfrågan" rename column num_rooms to antal_rum;
alter table public."offert_förfrågan" rename column "städ_frekvens" to stadfrekvens;
alter table public."offert_förfrågan" rename column window_count to antal_fonster;
alter table public."offert_förfrågan" rename column window_type to fonstertyp;
alter table public."offert_förfrågan" rename column glazed_balcony to inglasad_balkong;
alter table public."offert_förfrågan" rename column balcony_window_count to antal_balkongfonster;

-- kund_offert
alter table public.kund_offert rename column service_type to tjanst_typ;
alter table public.kund_offert rename column city to stad;
alter table public.kund_offert rename column phone to telefon;
alter table public.kund_offert rename column email to epost;
alter table public.kund_offert rename column created_at to skapad;
alter table public.kund_offert rename column booking_token to boknings_token;

-- kund_bokningar
alter table public.kund_bokningar rename column booking_id to boknings_id;
alter table public.kund_bokningar rename column requested_date to onskat_datum;
alter table public.kund_bokningar rename column accepted_offer to offert_accepterad;
alter table public.kund_bokningar rename column created_at to skapad;
alter table public.kund_bokningar rename column updated_at to uppdaterad;

-- bostads_priser
alter table public.bostads_priser rename column price_id to pris_id;
alter table public.bostads_priser rename column property_type to boendetyp;
alter table public.bostads_priser rename column num_rooms to antal_rum;
alter table public.bostads_priser rename column sqm_from to kvm_fran;
alter table public.bostads_priser rename column sqm_to to kvm_till;
alter table public.bostads_priser rename column base_fee to grundavgift;
alter table public.bostads_priser rename column price_per_sqm to pris_per_kvm;
alter table public.bostads_priser rename column "städ_frekvens" to stadfrekvens;
alter table public.bostads_priser rename column service_type to tjanst_typ;

-- fönsterputs_priser
alter table public."fönsterputs_priser" rename column price_id to pris_id;
alter table public."fönsterputs_priser" rename column property_type to boendetyp;
alter table public."fönsterputs_priser" rename column window_type to fonstertyp;
alter table public."fönsterputs_priser" rename column glazed_balcony to inglasad_balkong;
alter table public."fönsterputs_priser" rename column window_count_from to antal_fonster_fran;
alter table public."fönsterputs_priser" rename column window_count_to to antal_fonster_till;
alter table public."fönsterputs_priser" rename column base_fee to grundavgift;
alter table public."fönsterputs_priser" rename column price_per_window to pris_per_fonster;
alter table public."fönsterputs_priser" rename column balcony_window_price to pris_balkongfonster;

-- företags_priser
alter table public."företags_priser" rename column price_id to pris_id;
alter table public."företags_priser" rename column sqm_from to kvm_fran;
alter table public."företags_priser" rename column sqm_to to kvm_till;
alter table public."företags_priser" rename column "städ_frekvens" to stadfrekvens;
alter table public."företags_priser" rename column base_fee to grundavgift;
alter table public."företags_priser" rename column price_per_sqm to pris_per_kvm;

-- kontors_arbetsplats_priser
alter table public.kontors_arbetsplats_priser rename column price_id to pris_id;
alter table public.kontors_arbetsplats_priser rename column workstations_from to arbetsplatser_fran;
alter table public.kontors_arbetsplats_priser rename column workstations_to to arbetsplatser_till;
alter table public.kontors_arbetsplats_priser rename column monthly_addon_per_workstation to manadstillagg_per_arbetsplats;
