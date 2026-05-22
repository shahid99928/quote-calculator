import {
  calculateHousingLaborCost,
  calculateHousingOfferBreakdown
} from "../../supabase/functions/calculate-offer/housingLaborCost.ts";
import { calculateTrappLaborCost } from "../../supabase/functions/calculate-offer/stairLaborCost.ts";
import { buildLagenhetBostadsRows } from "./bostadsPriserCatalog.js";

const VAT_RATE = 0.25;
const RUT_DEDUCTION_RATE = 0.5;

export function expectedHousingOffert(tjanstTyp, numRooms, squareMeters, stadfrekvens = "Engångsstädning") {
  const rows = buildLagenhetBostadsRows(tjanstTyp, stadfrekvens);
  const labor = calculateHousingLaborCost(rows, numRooms, squareMeters);
  if (!labor.ok) {
    throw new Error(labor.error);
  }
  return calculateHousingOfferBreakdown(labor.laborCost, VAT_RATE, RUT_DEDUCTION_RATE).offert;
}

export function expectedWindowOffert({
  grundavgift,
  pris_per_fonster,
  pris_balkongfonster,
  windowCount,
  balconyWindowCount = 0,
  glazedBalcony = "Nej"
}) {
  const effectiveBalcony = glazedBalcony === "Ja" ? balconyWindowCount : 0;
  const laborCost =
    grundavgift + windowCount * pris_per_fonster + effectiveBalcony * pris_balkongfonster;
  const totalWithVat = laborCost * (1 + VAT_RATE);
  const rutDeduction = totalWithVat * RUT_DEDUCTION_RATE;
  return Number((totalWithVat - rutDeduction).toFixed(2));
}

/** Matches supabase/seed.sql företags_priser + kontors_arbetsplats (50 kr/plats). */
export function expectedForetagsOffertSeed(typAvLokal, squareMeters, workstations = 0) {
  const seedRows = {
    Kontor: { grundavgift: 900, pris_per_kvm: 10 },
    Butik: { grundavgift: 1000, pris_per_kvm: 11 },
    Industri: { grundavgift: 1200, pris_per_kvm: 13 }
  };
  const row = seedRows[typAvLokal];
  if (!row) {
    throw new Error(`Unknown seed business type: ${typAvLokal}`);
  }
  const workstationsAddon = typAvLokal === "Kontor" ? workstations * 50 : 0;
  return Number((row.grundavgift + squareMeters * row.pris_per_kvm + workstationsAddon).toFixed(2));
}

/** Same styckpris/kvm fixtures as tests/unit/stairLaborCost.test.js */
export function expectedTrappOffertFixture(input) {
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
  const result = calculateTrappLaborCost(kvmNivaer, styckpriser, frekvenser, input);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.breakdown.arbetskostnad;
}

/** Shared contact fields for calculate-offer integration payloads. */
export const INTEGRATION_CONTACT = {
  city: "Stockholm",
  phone: "0701234567",
  email: "integration-all-services@example.com",
  consent: true
};

export const HOUSING_BASE = {
  propertyType: "lagenhet",
  numRooms: 2,
  squareMeters: 50,
  ...INTEGRATION_CONTACT
};

/** Expected offert per service (migration bostads catalog or seed / stair fixtures). */
export const SERVICE_OFFER_CASES = [
  {
    serviceType: "Flyttstadning",
    payload: { ...HOUSING_BASE, serviceType: "Flyttstadning" },
    expectedOffert: () => expectedHousingOffert("Flyttstadning", 2, 50)
  },
  {
    serviceType: "Storstadning",
    payload: { ...HOUSING_BASE, serviceType: "Storstadning" },
    expectedOffert: () => expectedHousingOffert("Storstadning", 2, 50)
  },
  {
    serviceType: "Byggstadning",
    payload: { ...HOUSING_BASE, serviceType: "Byggstadning" },
    expectedOffert: () => expectedHousingOffert("Byggstadning", 2, 50)
  },
  {
    serviceType: "Visningsstadning",
    payload: { ...HOUSING_BASE, serviceType: "Visningsstadning" },
    expectedOffert: () => expectedHousingOffert("Visningsstadning", 2, 50)
  },
  {
    serviceType: "Hemstadning",
    payload: {
      ...HOUSING_BASE,
      serviceType: "Hemstadning",
      frequency: "1 gång/vecka"
    },
    expectedOffert: () => expectedHousingOffert("Hemstadning", 2, 50, "1 gång/vecka")
  },
  {
    serviceType: "Flyttstadning (3 rum, 70 kvm)",
    payload: {
      ...INTEGRATION_CONTACT,
      serviceType: "Flyttstadning",
      propertyType: "lagenhet",
      numRooms: 3,
      squareMeters: 70
    },
    expectedOffert: () => expectedHousingOffert("Flyttstadning", 3, 70)
  },
  {
    serviceType: "Fonsterputs",
    payload: {
      ...INTEGRATION_CONTACT,
      serviceType: "Fonsterputs",
      propertyType: "lagenhet",
      windowCount: 10,
      windowType: "2-sidiga (In/utvandiga)",
      glazedBalcony: "Ja",
      balconyWindowCount: 2
    },
    expectedOffert: () =>
      expectedWindowOffert({
        grundavgift: 300,
        pris_per_fonster: 70,
        pris_balkongfonster: 60,
        windowCount: 10,
        balconyWindowCount: 2,
        glazedBalcony: "Ja"
      })
  },
  {
    serviceType: "Foretagsstadning",
    payload: {
      ...INTEGRATION_CONTACT,
      serviceType: "Foretagsstadning",
      squareMeters: 100,
      frequency: "1 gång/vecka",
      businessLocalType: "Kontor",
      workstations: 5
    },
    expectedOffert: () => expectedForetagsOffertSeed("Kontor", 100, 5)
  },
  {
    serviceType: "Trappstadning BRFer",
    payload: {
      ...INTEGRATION_CONTACT,
      serviceType: "Trappstadning BRFer",
      squareMeters: 120,
      stairwells: 2,
      floors: 3,
      elevators: 0,
      stairFrequency: "Varannan vecka"
    },
    expectedOffert: () =>
      expectedTrappOffertFixture({
        kvm: 120,
        antalTrapphus: 2,
        antalVaningar: 3,
        antalHissar: 0,
        stadfrekvens: "Varannan vecka"
      })
  }
];
