-- Offert = formelpris (ingen moms/RUT i berakna_trapp_pris-svaret).

create or replace function public.berakna_trapp_pris(
  p_kvm integer,
  p_antal_trapphus integer,
  p_antal_vaningar integer,
  p_antal_hissar integer,
  p_stadfrekvens text
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_baspris numeric;
  v_pris_trapphus numeric;
  v_pris_vaningar numeric;
  v_pris_hissar numeric;
  v_faktor numeric;
  v_trapphus_kostnad numeric;
  v_vaningar_kostnad numeric;
  v_hiss_kostnad numeric;
  v_offert numeric;
begin
  if p_kvm is null or p_kvm < 1 then
    raise exception 'KVM_INVALID' using errcode = 'P0001';
  end if;

  if p_antal_trapphus is null or p_antal_trapphus < 1 then
    raise exception 'TRAPPHUS_INVALID' using errcode = 'P0001';
  end if;

  if p_antal_vaningar is null or p_antal_vaningar < 1 then
    raise exception 'VANINGAR_INVALID' using errcode = 'P0001';
  end if;

  if p_antal_hissar is null or p_antal_hissar < 0 then
    raise exception 'HISSAR_INVALID' using errcode = 'P0001';
  end if;

  select baspris
  into v_baspris
  from public.trapp_kvm_niva
  where p_kvm between kvm_fran and kvm_till
  limit 1;

  if v_baspris is null then
    raise exception 'KVM_OUT_OF_RANGE' using errcode = 'P0001';
  end if;

  select pris_per_styck into v_pris_trapphus
  from public.trapp_styckpris where dimension = 'trapphus';

  select pris_per_styck into v_pris_vaningar
  from public.trapp_styckpris where dimension = 'vaningar';

  select pris_per_styck into v_pris_hissar
  from public.trapp_styckpris where dimension = 'hissar';

  if v_pris_trapphus is null or v_pris_vaningar is null or v_pris_hissar is null then
    raise exception 'STYCKPRIS_MISSING' using errcode = 'P0001';
  end if;

  select faktor into v_faktor
  from public.trapp_frekvens
  where stadfrekvens = p_stadfrekvens;

  if v_faktor is null then
    raise exception 'FREQUENCY_NOT_SUPPORTED' using errcode = 'P0001';
  end if;

  v_trapphus_kostnad := p_antal_trapphus * v_pris_trapphus;
  v_vaningar_kostnad := p_antal_vaningar * v_pris_vaningar;
  v_hiss_kostnad := p_antal_hissar * v_pris_hissar;
  v_offert := round(
    (v_baspris + v_trapphus_kostnad + v_vaningar_kostnad + v_hiss_kostnad) * v_faktor,
    2
  );

  return jsonb_build_object(
    'arbetskostnad', v_offert,
    'offert', v_offert,
    'baspris', v_baspris,
    'antalTrapphus', p_antal_trapphus,
    'antalVaningar', p_antal_vaningar,
    'antalHissar', p_antal_hissar,
    'prisPerTrapphus', v_pris_trapphus,
    'prisPerVaning', v_pris_vaningar,
    'prisPerHiss', v_pris_hissar,
    'trapphusKostnad', round(v_trapphus_kostnad, 2),
    'vaningarKostnad', round(v_vaningar_kostnad, 2),
    'hissKostnad', round(v_hiss_kostnad, 2),
    'frekvensFaktor', v_faktor,
    'stadfrekvens', p_stadfrekvens
  );
end;
$$;
