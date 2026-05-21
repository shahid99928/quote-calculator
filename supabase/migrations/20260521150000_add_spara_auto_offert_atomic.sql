-- Atomic insert: offert_förfrågan + kund_offert in one transaction (no orphan auto rows).

create or replace function public.spara_auto_offert_atomic(
  p_offert_forfragan jsonb,
  p_kund_offert jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offert_id bigint;
  v_kund_id bigint;
  v_offert numeric;
  v_stad text;
  v_skapad timestamptz;
  v_tjanst_typ text;
begin
  insert into public."offert_förfrågan" (
    tjanst_typ,
    typ_av_lokal,
    antal_arbetsplatser,
    boendetyp,
    antal_rum,
    stadfrekvens,
    antal_trapphus,
    antal_vaningar,
    antal_hissar,
    kvadratmeter,
    antal_fonster,
    fonstertyp,
    inglasad_balkong,
    antal_balkongfonster,
    stad,
    telefon,
    epost,
    samtycke,
    status
  )
  select
    r.tjanst_typ,
    r.typ_av_lokal,
    r.antal_arbetsplatser,
    r.boendetyp,
    r.antal_rum,
    r.stadfrekvens,
    r.antal_trapphus,
    r.antal_vaningar,
    r.antal_hissar,
    r.kvadratmeter,
    r.antal_fonster,
    r.fonstertyp,
    r.inglasad_balkong,
    r.antal_balkongfonster,
    r.stad,
    r.telefon,
    r.epost,
    r.samtycke,
    r.status
  from jsonb_to_record(p_offert_forfragan) as r(
    tjanst_typ text,
    typ_av_lokal text,
    antal_arbetsplatser integer,
    boendetyp text,
    antal_rum integer,
    stadfrekvens text,
    antal_trapphus integer,
    antal_vaningar integer,
    antal_hissar integer,
    kvadratmeter numeric,
    antal_fonster integer,
    fonstertyp text,
    inglasad_balkong text,
    antal_balkongfonster integer,
    stad text,
    telefon text,
    epost text,
    samtycke boolean,
    status text
  )
  returning id into v_offert_id;

  insert into public.kund_offert (
    tjanst_typ,
    offert,
    stad,
    telefon,
    epost,
    boknings_token,
    boknings_token_galler_till,
    offert_forfragan_id
  )
  select
    k.tjanst_typ,
    k.offert,
    k.stad,
    k.telefon,
    k.epost,
    k.boknings_token,
    k.boknings_token_galler_till,
    v_offert_id
  from jsonb_to_record(p_kund_offert) as k(
    tjanst_typ text,
    offert numeric,
    stad text,
    telefon text,
    epost text,
    boknings_token text,
    boknings_token_galler_till timestamptz
  )
  returning id, offert, stad, skapad, tjanst_typ, offert_forfragan_id
  into v_kund_id, v_offert, v_stad, v_skapad, v_tjanst_typ, v_offert_id;

  return jsonb_build_object(
    'offert_forfragan_id', v_offert_id,
    'kund_offert', jsonb_build_object(
      'id', v_kund_id,
      'offert', v_offert,
      'stad', v_stad,
      'skapad', v_skapad,
      'tjanst_typ', v_tjanst_typ,
      'offert_forfragan_id', v_offert_id
    )
  );
end;
$$;
