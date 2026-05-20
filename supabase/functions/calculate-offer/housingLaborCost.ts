/** Price row from public.bostads_priser (already filtered by service + frequency). */
export type BostadsPrisRow = {
  antal_rum: number;
  kvm_fran: number;
  kvm_till: number;
  grundavgift: number;
  pris_per_kvm: number;
};

export type HousingLaborCostResult =
  | { ok: true; laborCost: number }
  | { ok: false; error: string };

export type HousingOfferBreakdown = {
  arbetskostnad: number;
  moms: number;
  prisInklMoms: number;
  rutAvdrag: number;
  offert: number;
};

/** Slutpris: moms på arbetskostnad, sedan RUT på belopp inkl. moms (samma som fönsterputs). */
export function calculateHousingOfferBreakdown(
  laborCost: number,
  vatRate = 0.25,
  rutDeductionRate = 0.5
): HousingOfferBreakdown {
  const moms = Number((laborCost * vatRate).toFixed(2));
  const prisInklMoms = Number((laborCost + moms).toFixed(2));
  const rutAvdrag = Number((prisInklMoms * rutDeductionRate).toFixed(2));
  const offert = Number((prisInklMoms - rutAvdrag).toFixed(2));
  return { arbetskostnad: laborCost, moms, prisInklMoms, rutAvdrag, offert };
}

export function calculateHousingOfferFromLaborCost(
  laborCost: number,
  vatRate = 0.25,
  rutDeductionRate = 0.5
): number {
  return calculateHousingOfferBreakdown(laborCost, vatRate, rutDeductionRate).offert;
}

/**
 * Labor cost (exkl. moms) for housing services from bostads_priser rows.
 *
 * - kvm <= kvm_till: grundavgift + kvm * pris_per_kvm (current room; always includes pris_per_kvm).
 * - kvm > kvm_till: grundavgift + kvm_till * pris_per_kvm (current room)
 *   + (kvm - kvm_till) * pris_per_kvm from antal_rum + 1.
 */
export function calculateHousingLaborCost(
  rows: BostadsPrisRow[],
  numRooms: number,
  squareMeters: number
): HousingLaborCostResult {
  if (!Number.isFinite(squareMeters) || squareMeters <= 0) {
    return { ok: false, error: "squareMeters must be greater than 0." };
  }
  if (!Number.isInteger(numRooms) || numRooms <= 0) {
    return { ok: false, error: "numRooms must be a positive integer." };
  }

  const roomRow = rows.find((row) => Number(row.antal_rum) === numRooms);
  if (!roomRow) {
    return {
      ok: false,
      error: `No price row found for selected property type with ${numRooms} room(s).`
    };
  }

  const kvmFrom = Number(roomRow.kvm_fran);
  const kvmTo = Number(roomRow.kvm_till);
  const baseFee = Number(roomRow.grundavgift);
  const pricePerSqmCurrent = Number(roomRow.pris_per_kvm);

  if (![kvmFrom, kvmTo, baseFee, pricePerSqmCurrent].every(Number.isFinite)) {
    return { ok: false, error: "Invalid numeric values in price row for selected room type." };
  }

  if (squareMeters > kvmTo) {
    const overflowSqm = squareMeters - kvmTo;
    const nextRoomRow = rows.find((row) => Number(row.antal_rum) === numRooms + 1);
    if (!nextRoomRow) {
      return {
        ok: false,
        error: `No price row found for next room type (${numRooms + 1}) to price overflow sqm.`
      };
    }
    const pricePerSqmNext = Number(nextRoomRow.pris_per_kvm);
    if (!Number.isFinite(pricePerSqmNext)) {
      return { ok: false, error: "Invalid pris_per_kvm on next room type price row." };
    }
    const laborCost =
      baseFee + kvmTo * pricePerSqmCurrent + overflowSqm * pricePerSqmNext;
    return { ok: true, laborCost };
  }

  const laborCost = baseFee + squareMeters * pricePerSqmCurrent;
  return { ok: true, laborCost };
}
