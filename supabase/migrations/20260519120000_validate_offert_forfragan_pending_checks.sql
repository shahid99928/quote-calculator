-- Constraints left NOT VALID after earlier migrations; repair legacy rows then validate.

update public."offert_förfrågan"
set antal_arbetsplatser = 1
where translate(lower(tjanst_typ), 'åäö', 'aao') = 'kontorstadning'
  and (antal_arbetsplatser is null or antal_arbetsplatser <= 0);

alter table public."offert_förfrågan" validate constraint offert_forfragan_antal_arbetsplatser_check;
alter table public."offert_förfrågan" validate constraint offert_forfragan_typ_av_lokal_check;
