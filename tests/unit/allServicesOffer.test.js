import { describe, expect, it } from "vitest";
import {
  buildLagenhetBostadsRows,
  LAGENHET_BRICKS
} from "../fixtures/bostadsPriserCatalog.js";
import {
  expectedForetagsOffertSeed,
  expectedHousingOffert,
  expectedTrappOffertFixture,
  expectedWindowOffert,
  SERVICE_OFFER_CASES
} from "../fixtures/offerExpectations.js";
import {
  calculateHousingLaborCost,
  calculateHousingOfferBreakdown
} from "../../supabase/functions/calculate-offer/housingLaborCost.ts";

describe("all supported services — expected offert (catalog math)", () => {
  for (const testCase of SERVICE_OFFER_CASES) {
    it(`${testCase.serviceType} matches formula`, () => {
      const expected = testCase.expectedOffert();
      expect(Number.isFinite(expected)).toBe(true);
      expect(expected).toBeGreaterThan(0);
    });
  }

  it("Flyttstädning lägenhet 2 rum 50 kvm = 1862.5 kr efter RUT", () => {
    expect(expectedHousingOffert("Flyttstadning", 2, 50)).toBe(1862.5);
  });

  it("Flyttstädning lägenhet 3 rum 70 kvm = 2510 kr efter RUT", () => {
    expect(expectedHousingOffert("Flyttstadning", 3, 70)).toBe(2510);
  });

  it("Företagsstädning seed Kontor 100 kvm + 5 platser = 2150 kr", () => {
    expect(expectedForetagsOffertSeed("Kontor", 100, 5)).toBe(2150);
  });

  it("Fönsterputs seed lägenhet 10 fönster = 700 kr efter RUT", () => {
    expect(
      expectedWindowOffert({
        grundavgift: 300,
        pris_per_fonster: 70,
        pris_balkongfonster: 60,
        windowCount: 10,
        balconyWindowCount: 2,
        glazedBalcony: "Ja"
      })
    ).toBe(700);
  });

  it("Trappstädning fixture 120 kvm = 2620 kr (exkl. moms/RUT)", () => {
    expect(
      expectedTrappOffertFixture({
        kvm: 120,
        antalTrapphus: 2,
        antalVaningar: 3,
        antalHissar: 0,
        stadfrekvens: "Varannan vecka"
      })
    ).toBe(2620);
  });
});

describe("housing services — each tjänst can be calculated from catalog rows", () => {
  const housingServices = [
    "Flyttstadning",
    "Storstadning",
    "Byggstadning",
    "Visningsstadning"
  ];

  for (const tjanstTyp of housingServices) {
    it(`${tjanstTyp} has rows for every lägenhet room bucket`, () => {
      const rows = buildLagenhetBostadsRows(tjanstTyp);
      expect(rows).toHaveLength(LAGENHET_BRICKS.length);
      for (const brick of LAGENHET_BRICKS) {
        const row = rows.find((r) => r.antal_rum === brick.antal_rum);
        expect(row).toBeTruthy();
        expect(row.grundavgift).toBe(brick.grund);
      }
    });
  }

  it("Hemstadning supports all six frequencies", () => {
    const frequencies = [
      "Engångsstädning",
      "1 gång/vecka",
      "2 gånger/vecka",
      "Varje dag",
      "1 gång/månad",
      "2 gånger/månad"
    ];
    for (const freq of frequencies) {
      const rows = buildLagenhetBostadsRows("Hemstadning", freq);
      const labor = calculateHousingLaborCost(rows, 2, 50);
      expect(labor.ok).toBe(true);
      if (labor.ok) {
        const pricing = calculateHousingOfferBreakdown(labor.laborCost);
        expect(pricing.offert).toBeGreaterThan(0);
      }
    }
  });

  it("overflow kvm uses next room pris_per_kvm (2 rum, 70 kvm)", () => {
    const rows = buildLagenhetBostadsRows("Flyttstadning");
    const labor = calculateHousingLaborCost(rows, 2, 70);
    expect(labor.ok).toBe(true);
    if (labor.ok) {
      expect(calculateHousingOfferBreakdown(labor.laborCost).offert).toBe(
        expectedHousingOffert("Flyttstadning", 2, 70)
      );
    }
  });
});
