import { describe, expect, it } from "vitest";
import { calculateTrappLaborCost } from "../../supabase/functions/calculate-offer/stairLaborCost.ts";

const kvmNivaer = [
  { kvm_fran: 50, kvm_till: 150, baspris: 1800 },
  { kvm_fran: 151, kvm_till: 300, baspris: 2800 },
  { kvm_fran: 301, kvm_till: 500, baspris: 4200 }
];

const styckpriser = [
  { dimension: "trapphus", pris_per_styck: 200 },
  { dimension: "vaningar", pris_per_styck: 140 },
  { dimension: "hissar", pris_per_styck: 100 }
];

const frekvenser = [
  { stadfrekvens: "1 gång/vecka", faktor: 0.85 },
  { stadfrekvens: "Varannan vecka", faktor: 1 },
  { stadfrekvens: "1 gång/månad", faktor: 1.2 }
];

describe("calculateTrappLaborCost", () => {
  it("multiplies styckpris by counts and applies frequency", () => {
    const result = calculateTrappLaborCost(kvmNivaer, styckpriser, frekvenser, {
      kvm: 200,
      antalTrapphus: 4,
      antalVaningar: 5,
      antalHissar: 2,
      stadfrekvens: "Varannan vecka"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 2800 + 4*200 + 5*140 + 2*100 = 4500
    expect(result.breakdown.arbetskostnad).toBe(4500);
    expect(result.breakdown.hissKostnad).toBe(200);
  });

  it("increases cost when elevator count increases", () => {
    const few = calculateTrappLaborCost(kvmNivaer, styckpriser, frekvenser, {
      kvm: 120,
      antalTrapphus: 2,
      antalVaningar: 3,
      antalHissar: 0,
      stadfrekvens: "Varannan vecka"
    });
    const many = calculateTrappLaborCost(kvmNivaer, styckpriser, frekvenser, {
      kvm: 120,
      antalTrapphus: 2,
      antalVaningar: 3,
      antalHissar: 4,
      stadfrekvens: "Varannan vecka"
    });
    expect(few.ok && many.ok).toBe(true);
    if (!few.ok || !many.ok) return;
    expect(many.breakdown.arbetskostnad).toBeGreaterThan(few.breakdown.arbetskostnad);
  });

  it("rejects kvm outside tiers", () => {
    const result = calculateTrappLaborCost(kvmNivaer, styckpriser, frekvenser, {
      kvm: 40,
      antalTrapphus: 1,
      antalVaningar: 2,
      antalHissar: 0,
      stadfrekvens: "Varannan vecka"
    });
    expect(result.ok).toBe(false);
  });

  it("uses calculated price as final offer (no moms or RUT)", () => {
    const result = calculateTrappLaborCost(kvmNivaer, styckpriser, frekvenser, {
      kvm: 200,
      antalTrapphus: 4,
      antalVaningar: 5,
      antalHissar: 2,
      stadfrekvens: "Varannan vecka"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.breakdown.arbetskostnad).toBe(4500);
  });
});
