export type TrappKvmNiva = { kvm_fran: number; kvm_till: number; baspris: number };
export type TrappStyckpris = { dimension: string; pris_per_styck: number };
export type TrappFrekvens = { stadfrekvens: string; faktor: number };

export type TrappPricingInput = {
  kvm: number;
  antalTrapphus: number;
  antalVaningar: number;
  antalHissar: number;
  stadfrekvens: string;
};

export type TrappLaborBreakdown = {
  arbetskostnad: number;
  baspris: number;
  antalTrapphus: number;
  antalVaningar: number;
  antalHissar: number;
  prisPerTrapphus: number;
  prisPerVaning: number;
  prisPerHiss: number;
  trapphusKostnad: number;
  vaningarKostnad: number;
  hissKostnad: number;
  frekvensFaktor: number;
  stadfrekvens: string;
};

export type TrappLaborCostResult =
  | { ok: true; breakdown: TrappLaborBreakdown }
  | { ok: false; error: string };

function findStyckpris(rows: TrappStyckpris[], dimension: string): number | null {
  const row = rows.find((r) => r.dimension === dimension);
  if (!row || !Number.isFinite(Number(row.pris_per_styck))) return null;
  return Number(row.pris_per_styck);
}

/**
 * Slutpris (utan moms/RUT):
 * arbetskostnad = (kvm_bas + trapphus×pris + våningar×pris + hissar×pris) × frekvensfaktor
 */
export function calculateTrappLaborCost(
  kvmNivaer: TrappKvmNiva[],
  styckpriser: TrappStyckpris[],
  frekvenser: TrappFrekvens[],
  input: TrappPricingInput
): TrappLaborCostResult {
  const { kvm, antalTrapphus, antalVaningar, antalHissar, stadfrekvens } = input;

  if (!Number.isInteger(kvm) || kvm < 50 || kvm > 500) {
    return { ok: false, error: "squareMeters must be between 50 and 500 for Trappstadning BRFer." };
  }
  if (!Number.isInteger(antalTrapphus) || antalTrapphus < 1 || antalTrapphus > 99) {
    return { ok: false, error: "stairwells must be an integer between 1 and 99." };
  }
  if (!Number.isInteger(antalVaningar) || antalVaningar < 1 || antalVaningar > 99) {
    return { ok: false, error: "floors must be an integer between 1 and 99." };
  }
  if (!Number.isInteger(antalHissar) || antalHissar < 0 || antalHissar > 99) {
    return { ok: false, error: "elevators must be an integer between 0 and 99." };
  }

  const kvmRow = kvmNivaer.find((row) => kvm >= Number(row.kvm_fran) && kvm <= Number(row.kvm_till));
  if (!kvmRow) {
    return { ok: false, error: "No kvm price tier found for selected square meters." };
  }

  const prisPerTrapphus = findStyckpris(styckpriser, "trapphus");
  const prisPerVaning = findStyckpris(styckpriser, "vaningar");
  const prisPerHiss = findStyckpris(styckpriser, "hissar");
  if (prisPerTrapphus === null || prisPerVaning === null || prisPerHiss === null) {
    return { ok: false, error: "Stair unit prices are not configured." };
  }

  const freqRow = frekvenser.find((row) => row.stadfrekvens === stadfrekvens);
  if (!freqRow || !Number.isFinite(Number(freqRow.faktor))) {
    return {
      ok: false,
      error: "frequency must be one of: 1 gång/vecka, Varannan vecka, 1 gång/månad."
    };
  }

  const baspris = Number(kvmRow.baspris);
  const trapphusKostnad = antalTrapphus * prisPerTrapphus;
  const vaningarKostnad = antalVaningar * prisPerVaning;
  const hissKostnad = antalHissar * prisPerHiss;
  const frekvensFaktor = Number(freqRow.faktor);
  const arbetskostnad = Number(
    ((baspris + trapphusKostnad + vaningarKostnad + hissKostnad) * frekvensFaktor).toFixed(2)
  );

  return {
    ok: true,
    breakdown: {
      arbetskostnad,
      baspris,
      antalTrapphus,
      antalVaningar,
      antalHissar,
      prisPerTrapphus,
      prisPerVaning: prisPerVaning,
      prisPerHiss,
      trapphusKostnad: Number(trapphusKostnad.toFixed(2)),
      vaningarKostnad: Number(vaningarKostnad.toFixed(2)),
      hissKostnad: Number(hissKostnad.toFixed(2)),
      frekvensFaktor,
      stadfrekvens
    }
  };
}
