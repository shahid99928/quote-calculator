-- Backfill kund_offert.offert_forfragan_id for rows created before the column was populated.
-- Match on service, contact, city and closest skapad timestamp (same calculate-offer request).

with candidates as (
  select
    ko.id as kund_id,
    of.id as offert_id,
    abs(extract(epoch from (ko.skapad - of.skapad))) as sec_diff,
    row_number() over (
      partition by ko.id
      order by abs(extract(epoch from (ko.skapad - of.skapad)))
    ) as rn_kund,
    row_number() over (
      partition by of.id
      order by abs(extract(epoch from (ko.skapad - of.skapad)))
    ) as rn_offert
  from public.kund_offert ko
  join public."offert_förfrågan" of on
    ko.offert_forfragan_id is null
    and translate(lower(trim(ko.tjanst_typ)), 'åäö', 'aao')
      = translate(lower(trim(of.tjanst_typ)), 'åäö', 'aao')
    and lower(trim(ko.stad)) = lower(trim(of.stad))
    and regexp_replace(ko.telefon, '[^0-9+]', '', 'g')
      = regexp_replace(of.telefon, '[^0-9+]', '', 'g')
    and lower(trim(ko.epost)) = lower(trim(of.epost))
    and abs(extract(epoch from (ko.skapad - of.skapad))) <= 30
),
pairs as (
  select kund_id, offert_id
  from candidates
  where rn_kund = 1
    and rn_offert = 1
)
update public.kund_offert ko
set offert_forfragan_id = p.offert_id
from pairs p
where ko.id = p.kund_id
  and ko.offert_forfragan_id is null;
