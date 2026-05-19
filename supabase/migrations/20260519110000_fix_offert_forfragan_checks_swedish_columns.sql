-- Recreate CHECK constraints with Swedish column names (after 20260512120000 rename).
-- Repair legacy rows first; ADD CONSTRAINT validates all existing data.

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_fonsterputs_check;

-- Nej: balkongfönster ska vara null (inte 0) – vanlig legacy från Number("") i formuläret.
update public."offert_förfrågan"
set antal_balkongfonster = null
where inglasad_balkong = 'Nej'
  and antal_balkongfonster is not null;

-- Övriga tjänster ska inte ha fönsterfält ifyllda.
update public."offert_förfrågan"
set
  antal_fonster = null,
  fonstertyp = null,
  inglasad_balkong = null,
  antal_balkongfonster = null
where translate(lower(tjanst_typ), 'åäö', 'aao') <> 'fonsterputs'
  and (
    antal_fonster is not null
    or fonstertyp is not null
    or inglasad_balkong is not null
    or antal_balkongfonster is not null
  );

-- Fönsterputs ska inte ha kvm.
update public."offert_förfrågan"
set kvadratmeter = null
where translate(lower(tjanst_typ), 'åäö', 'aao') = 'fonsterputs'
  and kvadratmeter is not null;

-- Ofullständiga fönsterputs-rader (t.ex. id 1 med bara tjanst_typ) – legacy/test.
delete from public."offert_förfrågan"
where translate(lower(tjanst_typ), 'åäö', 'aao') = 'fonsterputs'
  and (
    boendetyp is null
    or antal_fonster is null
    or fonstertyp is null
    or inglasad_balkong is null
  );

alter table public."offert_förfrågan"
  add constraint offert_forfragan_fonsterputs_check
  check (
    (
      translate(lower(tjanst_typ), 'åäö', 'aao') = 'fonsterputs'
      and boendetyp in ('lagenhet', 'radhus', 'villa')
      and antal_fonster is not null
      and antal_fonster > 0
      and fonstertyp in (
        '2-sidiga (In/utvandiga)',
        '4-sidiga (In/utvandiga samt emellan)',
        'Annan'
      )
      and inglasad_balkong in ('Ja', 'Nej')
      and (
        (inglasad_balkong = 'Ja' and antal_balkongfonster is not null and antal_balkongfonster > 0)
        or
        (inglasad_balkong = 'Nej' and antal_balkongfonster is null)
      )
    )
    or
    (
      translate(lower(tjanst_typ), 'åäö', 'aao') <> 'fonsterputs'
      and antal_fonster is null
      and fonstertyp is null
      and inglasad_balkong is null
      and antal_balkongfonster is null
    )
  );

alter table public."offert_förfrågan"
  drop constraint if exists offert_forfragan_square_meters_by_service_check;

-- Övriga tjänster (utom fönsterputs) ska ha kvm; sätt minimivärde på trasiga legacy-rader.
update public."offert_förfrågan"
set kvadratmeter = 1
where translate(lower(tjanst_typ), 'åäö', 'aao') <> 'fonsterputs'
  and (kvadratmeter is null or kvadratmeter <= 0);

alter table public."offert_förfrågan"
  add constraint offert_forfragan_square_meters_by_service_check
  check (
    (
      translate(lower(tjanst_typ), 'åäö', 'aao') = 'fonsterputs'
      and kvadratmeter is null
    )
    or
    (
      translate(lower(tjanst_typ), 'åäö', 'aao') <> 'fonsterputs'
      and kvadratmeter is not null
      and kvadratmeter > 0
    )
  );
