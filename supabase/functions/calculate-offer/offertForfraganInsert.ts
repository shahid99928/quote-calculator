import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const OFFERT_FORFRAGAN_STATUS = {
  AUTO: "auto",
  MANUELL: "manuell"
} as const;

export type OffertForfraganStatus =
  (typeof OFFERT_FORFRAGAN_STATUS)[keyof typeof OFFERT_FORFRAGAN_STATUS];

/** Fields built from the calculator form (status set at insert time). */
export type OffertForfraganFields = {
  tjanst_typ: string;
  typ_av_lokal: string | null;
  antal_arbetsplatser: number | null;
  boendetyp: string | null;
  antal_rum: number | null;
  stadfrekvens: string | null;
  antal_trapphus: number | null;
  antal_vaningar: number | null;
  antal_hissar: number | null;
  kvadratmeter: number | null;
  antal_fonster: number | null;
  fonstertyp: string | null;
  inglasad_balkong: string | null;
  antal_balkongfonster: number | null;
  stad: string;
  telefon: string;
  epost: string;
  samtycke: boolean;
};

export type OffertForfraganInsert = OffertForfraganFields & {
  status: OffertForfraganStatus;
};

export type BuildOffertForfraganParams = {
  persistedServiceType: string;
  normalizedPropertyType: string;
  numRooms: number;
  squareMeters: number;
  frequency: string;
  businessLocalType: string;
  workstations: number;
  stairwells: number;
  floors: number;
  elevators: number;
  stairFrequency: string;
  windowCount: number;
  windowType: string;
  glazedBalcony: string;
  balconyWindowCount: number;
  city: string;
  phone: string;
  email: string;
  consent: boolean;
  isBusinessService: boolean;
  isHomeService: boolean;
  isStairService: boolean;
  isWindowService: boolean;
};

/** Same fields for manual review (no kund_offert, no email) and automatic quotes. */
export function buildOffertForfraganRow(params: BuildOffertForfraganParams): OffertForfraganFields {
  const {
    persistedServiceType,
    normalizedPropertyType,
    numRooms,
    squareMeters,
    frequency,
    businessLocalType,
    workstations,
    stairwells,
    floors,
    elevators,
    stairFrequency,
    windowCount,
    windowType,
    glazedBalcony,
    balconyWindowCount,
    city,
    phone,
    email,
    consent,
    isBusinessService,
    isHomeService,
    isStairService,
    isWindowService
  } = params;

  const roundedSquareMeters = Math.round(squareMeters);

  return {
    tjanst_typ: persistedServiceType,
    typ_av_lokal: isBusinessService ? businessLocalType : null,
    antal_arbetsplatser: persistedServiceType === "kontorstädning" ? workstations : null,
    boendetyp: isBusinessService || isStairService ? null : normalizedPropertyType,
    antal_rum:
      isBusinessService || isWindowService || isStairService
        ? null
        : Number.isInteger(numRooms) && numRooms > 0
          ? numRooms
          : null,
    stadfrekvens:
      isBusinessService || isHomeService
        ? frequency
        : isStairService
          ? stairFrequency
          : null,
    antal_trapphus: isStairService ? stairwells : null,
    antal_vaningar: isStairService ? floors : null,
    antal_hissar: isStairService ? elevators : null,
    kvadratmeter: isWindowService ? null : roundedSquareMeters,
    antal_fonster: isWindowService ? windowCount : null,
    fonstertyp: isWindowService ? windowType : null,
    inglasad_balkong: isWindowService ? glazedBalcony : null,
    antal_balkongfonster:
      isWindowService && glazedBalcony === "Ja" ? balconyWindowCount : null,
    stad: city,
    telefon: phone,
    epost: email,
    samtycke: consent
  };
}

export async function saveOffertForfragan(
  supabase: SupabaseClient,
  row: OffertForfraganInsert
): Promise<{ id: number | null; error: string | null }> {
  const { data, error } = await supabase.from("offert_förfrågan").insert(row).select("id").single();

  if (error) {
    console.error("offert_förfrågan insert failed:", error.message, row);
    return { id: null, error: error.message };
  }

  return { id: data?.id ?? null, error: null };
}

const ROLLBACK_DELETE_ATTEMPTS = 3;
const ROLLBACK_DELETE_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deleteOffertForfraganById(
  supabase: SupabaseClient,
  id: number
): Promise<string | null> {
  const { error } = await supabase.from("offert_förfrågan").delete().eq("id", id);
  if (error) {
    console.error("offert_förfrågan rollback delete failed:", error.message, id);
    return error.message;
  }
  return null;
}

/** Retries rollback delete when a non-transactional path must clean up a saved request. */
export async function deleteOffertForfraganByIdWithRetry(
  supabase: SupabaseClient,
  id: number
): Promise<string | null> {
  let lastError: string | null = null;
  for (let attempt = 1; attempt <= ROLLBACK_DELETE_ATTEMPTS; attempt++) {
    lastError = await deleteOffertForfraganById(supabase, id);
    if (!lastError) return null;
    if (attempt < ROLLBACK_DELETE_ATTEMPTS) {
      await delay(ROLLBACK_DELETE_DELAY_MS * attempt);
    }
  }
  console.error(
    `offert_förfrågan rollback delete failed after ${ROLLBACK_DELETE_ATTEMPTS} attempts:`,
    lastError,
    id
  );
  return lastError;
}
