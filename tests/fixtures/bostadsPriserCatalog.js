/**
 * Canonical lägenhet price bricks from migration 20260513200000_recreate_bostads_priser.sql
 * (grund + per-service pris_per_kvm columns).
 */
export const LAGENHET_BRICKS = [
  { antal_rum: 1, kvm_fran: 20, kvm_till: 44, grund: 1020, pris_hem_eng: 30.6, pris_flytt: 34.2, pris_stor: 28.9, pris_bygg: 32.1, pris_visning: 29.3 },
  { antal_rum: 2, kvm_fran: 45, kvm_till: 64, grund: 1200, pris_hem_eng: 31.8, pris_flytt: 35.6, pris_stor: 28.9, pris_bygg: 32.1, pris_visning: 29.3 },
  { antal_rum: 3, kvm_fran: 65, kvm_till: 84, grund: 1440, pris_hem_eng: 33.0, pris_flytt: 36.8, pris_stor: 30.2, pris_bygg: 34.9, pris_visning: 31.7 },
  { antal_rum: 4, kvm_fran: 85, kvm_till: 104, grund: 1740, pris_hem_eng: 34.2, pris_flytt: 38.1, pris_stor: 31.4, pris_bygg: 36.2, pris_visning: 33.0 },
  { antal_rum: 5, kvm_fran: 105, kvm_till: 124, grund: 2040, pris_hem_eng: 35.4, pris_flytt: 39.5, pris_stor: 32.6, pris_bygg: 37.5, pris_visning: 34.2 },
  { antal_rum: 6, kvm_fran: 125, kvm_till: 150, grund: 2340, pris_hem_eng: 36.6, pris_flytt: 41.0, pris_stor: 33.8, pris_bygg: 38.9, pris_visning: 35.4 }
];

export const HEM_STADFREKVENS_FAKTOR = {
  "Engångsstädning": 1.2,
  "1 gång/vecka": 0.82,
  "2 gånger/vecka": 0.72,
  "Varje dag": 0.62,
  "1 gång/månad": 1.0,
  "2 gånger/månad": 0.9
};

const HOUSING_SERVICE_PRICE_KEY = {
  Flyttstadning: "pris_flytt",
  Storstadning: "pris_stor",
  Byggstadning: "pris_bygg",
  Visningsstadning: "pris_visning"
};

export function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Rows shaped like public.bostads_priser for one lägenhet service + frequency. */
export function buildLagenhetBostadsRows(tjanstTyp, stadfrekvens = "Engångsstädning") {
  return LAGENHET_BRICKS.map((brick) => {
    if (tjanstTyp === "Hemstadning") {
      const faktor = HEM_STADFREKVENS_FAKTOR[stadfrekvens];
      if (!faktor) {
        throw new Error(`Unknown Hemstadning frequency: ${stadfrekvens}`);
      }
      return {
        antal_rum: brick.antal_rum,
        kvm_fran: brick.kvm_fran,
        kvm_till: brick.kvm_till,
        grundavgift: round2((brick.grund * faktor) / 1.2),
        pris_per_kvm: round2((brick.pris_hem_eng * faktor) / 1.2)
      };
    }

    const priceKey = HOUSING_SERVICE_PRICE_KEY[tjanstTyp];
    if (!priceKey) {
      throw new Error(`Not a housing catalog service: ${tjanstTyp}`);
    }

    return {
      antal_rum: brick.antal_rum,
      kvm_fran: brick.kvm_fran,
      kvm_till: brick.kvm_till,
      grundavgift: brick.grund,
      pris_per_kvm: brick[priceKey]
    };
  });
}
