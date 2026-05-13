-- Minimal deterministic dataset for local integration tests.

truncate table public.kund_bokningar restart identity cascade;
truncate table public.kund_offert restart identity cascade;
truncate table public."offert_förfrågan" restart identity cascade;
truncate table public.kontors_arbetsplats_priser restart identity cascade;
truncate table public."fönsterputs_priser" restart identity cascade;
truncate table public."företags_priser" restart identity cascade;

insert into public."företags_priser" (
  typ_av_lokal,
  kvm_fran,
  kvm_till,
  stadfrekvens,
  grundavgift,
  pris_per_kvm
)
values
  ('Kontor', 50, 300, '1 gång/vecka', 900, 10),
  ('Butik', 50, 300, '1 gång/vecka', 1000, 11),
  ('Industri', 50, 300, '1 gång/vecka', 1200, 13);

insert into public.kontors_arbetsplats_priser (
  arbetsplatser_fran,
  arbetsplatser_till,
  manadstillagg_per_arbetsplats
)
values (1, 200, 50);

insert into public."fönsterputs_priser" (
  boendetyp,
  fonstertyp,
  inglasad_balkong,
  antal_fonster_fran,
  antal_fonster_till,
  grundavgift,
  pris_per_fonster,
  pris_balkongfonster
)
values
  ('lagenhet', '2-sidiga (In/utvandiga)', 'Ja', 1, 80, 300, 70, 60),
  ('lagenhet', '2-sidiga (In/utvandiga)', 'Nej', 1, 80, 280, 65, 0),
  ('villa', '2-sidiga (In/utvandiga)', 'Ja', 1, 80, 350, 80, 70),
  ('villa', '2-sidiga (In/utvandiga)', 'Nej', 1, 80, 330, 75, 0);
