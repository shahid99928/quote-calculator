import { describe, expect, it } from "vitest";
import {
  calculateHousingLaborCost,
  calculateHousingOfferBreakdown
} from "../../supabase/functions/calculate-offer/housingLaborCost.ts";

/** lägenhet Flyttstädning Engångs – matches migration brick for lägenhet 2–3. */
const lagenhetFlytt = [
  { antal_rum: 2, kvm_fran: 45, kvm_till: 64, grundavgift: 1200, pris_per_kvm: 35.6 },
  { antal_rum: 3, kvm_fran: 65, kvm_till: 84, grundavgift: 1440, pris_per_kvm: 36.8 }
];

describe("calculateHousingLaborCost", () => {
  it("includes pris_per_kvm when kvm is below kvm_fran for selected room", () => {
    const result = calculateHousingLaborCost(lagenhetFlytt, 2, 40);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // 1200 + 40 * 35.6 = 2624
      expect(result.laborCost).toBe(2624);
    }
  });

  it("flyttstadning 2a 40 kvm with VAT then RUT on amount incl. VAT", () => {
    const labor = calculateHousingLaborCost(lagenhetFlytt, 2, 40);
    expect(labor.ok).toBe(true);
    if (labor.ok) {
      const pricing = calculateHousingOfferBreakdown(labor.laborCost);
      expect(pricing.arbetskostnad).toBe(2624);
      expect(pricing.moms).toBe(656);
      expect(pricing.prisInklMoms).toBe(3280);
      expect(pricing.rutAvdrag).toBe(1640);
      expect(pricing.offert).toBe(1640);
    }
  });

  it("prices kvm up to kvm_till at current room plus overflow at next room", () => {
    const result = calculateHousingLaborCost(lagenhetFlytt, 2, 70);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // 1200 + 64 * 35.6 + (70 - 64) * 36.8 = 3699.2
      expect(result.laborCost).toBeCloseTo(3699.2, 5);
    }
  });

  it("prices 1a with overflow using kvm_till not interval span", () => {
    const lagenhet1och2 = [
      { antal_rum: 1, kvm_fran: 20, kvm_till: 44, grundavgift: 1020, pris_per_kvm: 34.2 },
      { antal_rum: 2, kvm_fran: 45, kvm_till: 64, grundavgift: 1200, pris_per_kvm: 35.6 }
    ];
    const result = calculateHousingLaborCost(lagenhet1och2, 1, 50);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // 1020 + 44 * 34.2 + (50 - 44) * 35.6 = 2738.4
      expect(result.laborCost).toBeCloseTo(2738.4, 5);
    }
  });

  it("uses standard formula when kvm is within interval", () => {
    const result = calculateHousingLaborCost(lagenhetFlytt, 2, 50);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.laborCost).toBe(1200 + 50 * 35.6);
    }
  });

  it("fails when selected room type has no price row", () => {
    const result = calculateHousingLaborCost(lagenhetFlytt, 5, 50);
    expect(result.ok).toBe(false);
  });

  it("applies VAT then RUT on amount incl. VAT for final housing offer", () => {
    const pricing = calculateHousingOfferBreakdown(2738.4);
    expect(pricing.rutAvdrag).toBe(1711.5);
    expect(pricing.offert).toBe(1711.5);
  });

  it("fails when overflow needs next room but no row exists", () => {
    const result = calculateHousingLaborCost(
      [{ antal_rum: 6, kvm_fran: 125, kvm_till: 150, grundavgift: 2340, pris_per_kvm: 41 }],
      6,
      160
    );
    expect(result.ok).toBe(false);
  });
});
