/** Row shape for public.offert_förfrågan – used for both automatic and manual quote flows. */
export type OffertForfraganInsert = {
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
export function buildOffertForfraganRow(params: BuildOffertForfraganParams): OffertForfraganInsert {
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
    antal_rum: isBusinessService || isWindowService || isStairService ? null : numRooms,
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
